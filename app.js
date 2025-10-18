const express = require('express');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require("path");
const xss = require("xss");

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);

app.use(cors());
app.use(bodyParser.json());

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(__dirname + "/build"));
    app.get("*", (req, res) => {
        res.sendFile(path.join(__dirname + "/build/index.html"));
    });
}

app.set('port', (process.env.PORT || 4001));

// XSS sanitizer
const sanitizeString = (str) => xss(str);

// Data stores
let connections = {};
let messages = {};
let timeOnline = {};
let roomPasswords = {}; // Store meeting passwords

// ------------------ Password-protected endpoints ------------------ //

// Create a room with server-generated password
app.post('/create-room', (req, res) => {
    // Generate random 6-character password
    let password;
    do {
        password = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (roomPasswords[password]); // ensure uniqueness

    roomPasswords[password] = password; // password is now the room ID
    return res.json({ success: true, password });
});

// Join room by password
app.post('/join-room', (req, res) => {
    const { password } = req.body;
    if (!password || !roomPasswords[password]) {
        return res.status(404).json({ success: false, message: "Room does not exist" });
    }
    return res.json({ success: true });
});

// ------------------ Socket.io handlers ------------------ //
io.on('connection', (socket) => {

    socket.on('join-call', (path) => {
        if (!connections[path]) {
            connections[path] = [];
            io.to(socket.id).emit('set-admin', true); // first user is admin
        } else {
            io.to(socket.id).emit('set-admin', false);
        }

        connections[path].push(socket.id);
        timeOnline[socket.id] = new Date();

        connections[path].forEach(id => {
            io.to(id).emit("user-joined", socket.id, connections[path]);
        });

        if (messages[path]) {
            messages[path].forEach(msg => {
                io.to(socket.id).emit("chat-message", msg.data, msg.sender, msg["socket-id-sender"]);
            });
        }

        console.log(path, connections[path]);
    });

    socket.on('signal', (toId, message) => {
        io.to(toId).emit('signal', socket.id, message);
    });

    socket.on('chat-message', (data, sender) => {
        data = sanitizeString(data);
        sender = sanitizeString(sender);

        let key;
        let ok = false;
        for (const [k, v] of Object.entries(connections)) {
            if (v.includes(socket.id)) {
                key = k;
                ok = true;
                break;
            }
        }

        if (ok) {
            if (!messages[key]) messages[key] = [];
            messages[key].push({ sender, data, "socket-id-sender": socket.id });

            connections[key].forEach(id => {
                io.to(id).emit("chat-message", data, sender, socket.id);
            });
        }
    });

    socket.on('disconnect', () => {
        let key;
        let diffTime = Math.abs(new Date() - timeOnline[socket.id]);

        for (const [k, v] of Object.entries(connections)) {
            if (v.includes(socket.id)) {
                key = k;

                connections[key].forEach(id => {
                    io.to(id).emit("user-left", socket.id);
                });

                connections[key] = connections[key].filter(id => id !== socket.id);
                console.log(key, socket.id, Math.ceil(diffTime / 1000));

                if (connections[key].length === 0) {
                    delete connections[key];
                    delete roomPasswords[key]; // remove password when room is empty
                    delete messages[key];
                }
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 4001;
server.listen(PORT, () => console.log("listening on", PORT));
