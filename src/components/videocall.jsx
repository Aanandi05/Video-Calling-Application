import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";


const VideoCall = () => {
  const [roomId, setRoomId] = useState("");
  const [inCall, setInCall] = useState(false);

  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);

  const [localStream, setLocalStream] = useState(null);
  const myVideo = useRef(null);

  // Multi-participant
  const [remoteStreams, setRemoteStreams] = useState({}); // { participantId: MediaStream }
  const peers = useRef({}); // { participantId: RTCPeerConnection }

  const socket = useRef(null);

  // Chat
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");

  // Initialize socket
  useEffect(() => {
    // At the top of the component or inside useEffect
    socket.current = io(SOCKET_URL);



    socket.current.on("receive-message", (msgObj) => {
      setMessages((prev) => [...prev, msgObj]);
    });

    socket.current.on("user-joined", async ({ participantId }) => {
      if (participantId === socket.current.id) return; // ignore self
      if (peers.current[participantId]) return;       // already connected

      // 1. Create a new peer connection
      const pcNew = createPeerConnection(participantId);
      peers.current[participantId] = pcNew;

      // 2. Add local tracks
      if (localStream) {
        localStream.getTracks().forEach((track) => pcNew.addTrack(track, localStream));
      }

      // 3. Create offer to new participant
      const offer = await pcNew.createOffer();
      await pcNew.setLocalDescription(offer);
      socket.current.emit("offer", { offer, to: participantId });
    });


    socket.current.on("user-left", ({ participantId }) => {
      if (peers.current[participantId]) {
        peers.current[participantId].close();
        delete peers.current[participantId];
      }

      setRemoteStreams((prev) => {
        const updated = { ...prev };
        delete updated[participantId];
        return updated;
      });
    });


    socket.current.on("offer", async ({ offer, from }) => {
      if (!peers.current[from]) {
        peers.current[from] = createPeerConnection(from);
      }
      const pcNew = peers.current[from];
      await pcNew.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pcNew.createAnswer();
      await pcNew.setLocalDescription(answer);
      socket.current.emit("answer", { answer, to: from });
    });

    socket.current.on("answer", async ({ answer, from }) => {
      if (peers.current[from]) {
        await peers.current[from].setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.current.on("ice-candidate", async ({ candidate, from }) => {
      if (peers.current[from] && candidate) {
        try {
          await peers.current[from].addIceCandidate(candidate);
        } catch (err) {
          console.warn("ICE candidate error:", err);
        }
      }
    });

    return () => {
      socket.current?.disconnect();
    };
  }, [localStream]);

  // Create PeerConnection for multi-participant
  const createPeerConnection = (participantId) => {
    const pcNew = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    // When receiving remote tracks
    pcNew.ontrack = (event) => {
      setRemoteStreams((prev) => ({ ...prev, [participantId]: event.streams[0] }));
    };

    // When ICE candidates are found
    pcNew.onicecandidate = (event) => {
      if (event.candidate) {
        socket.current.emit("ice-candidate", { candidate: event.candidate, to: participantId });
      }
    };

    return pcNew;
  };


  const createRoom = () => {
    const newRoom = Math.random().toString(36).substring(2, 9);
    setRoomId(newRoom);
    initCall(newRoom);
  };

  const joinRoom = () => {
    if (!roomId.trim()) return alert("Enter room ID");
    initCall(roomId);
  };

  const initCall = (room) => {
    socket.current.emit("join-room", room);
    setInCall(true);
  };

  // Camera & Mic
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setLocalStream((prev) => {
        if (prev) {
          prev.addTrack(stream.getVideoTracks()[0]);
          return prev;
        }
        return stream;
      });

      if (myVideo.current) myVideo.current.srcObject = localStream || stream;

      // Add tracks to all peers
      Object.values(peers.current).forEach((peer) => {
        const sender = peer.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(stream.getVideoTracks()[0]);
        else peer.addTrack(stream.getVideoTracks()[0], stream);
      });

      setCameraOn(true);
    } catch (err) {
      console.error(err);
    }
  };

  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      setLocalStream((prev) => {
        if (prev) {
          prev.addTrack(stream.getAudioTracks()[0]);
          return prev;
        }
        return stream;
      });

      Object.values(peers.current).forEach((peer) => {
        const sender = peer.getSenders().find((s) => s.track?.kind === "audio");
        if (sender) sender.replaceTrack(stream.getAudioTracks()[0]);
        else peer.addTrack(stream.getAudioTracks()[0], stream);
      });

      setMicOn(true);
      setIsMuted(false);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleCamera = async () => {
    if (!localStream) return;

    if (cameraOn) {
      // Stop all video tracks (turns off LED)
      localStream.getVideoTracks().forEach(track => track.stop());

      // Remove video track from all peers
      Object.values(peers.current).forEach(peer => {
        const sender = peer.getSenders().find(s => s.track?.kind === "video");
        if (sender) peer.removeTrack(sender);
      });

      // Clear local video element
      if (myVideo.current) myVideo.current.srcObject = null;

      setLocalStream(prev => {
        // Keep only audio tracks if any
        const audioTracks = prev?.getAudioTracks() || [];
        const newStream = new MediaStream(audioTracks);
        return newStream;
      });

      setCameraOn(false);
    } else {
      try {
        // Request fresh video track
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });

        // Merge with existing audio tracks if present
        localStream?.getAudioTracks().forEach(track => newStream.addTrack(track));

        // Replace or add video track in all peers
        Object.values(peers.current).forEach(peer => {
          const sender = peer.getSenders().find(s => s.track?.kind === "video");
          if (sender) sender.replaceTrack(newStream.getVideoTracks()[0]);
          else peer.addTrack(newStream.getVideoTracks()[0], newStream);
        });

        // Update local stream and video element
        setLocalStream(newStream);
        if (myVideo.current) {
          myVideo.current.srcObject = newStream;
          await myVideo.current.play().catch(() => {});
        }

        setCameraOn(true);
      } catch (err) {
        console.error("Error starting camera:", err);
      }
    }
  };






  const toggleMute = async () => {
    if (!localStream) return;
    if (micOn && !isMuted) {
      localStream.getAudioTracks()[0]?.stop();
      setMicOn(false);
      setIsMuted(true);
    } else {
      await startMic();
    }
  };

  const screenTrackRef = useRef(null);

  const toggleScreenShare = async () => {
    if (!localStream) return;

    if (!isSharingScreen) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack; // store it

        // Replace track for all peers
        Object.values(peers.current).forEach((peer) => {
          const sender = peer.getSenders().find((s) => s.track?.kind === "video");
          if (sender) sender.replaceTrack(screenTrack);
        });

        if (myVideo.current) myVideo.current.srcObject = screenStream;
        setIsSharingScreen(true);

        // Restore camera when user ends via browser UI
        screenTrack.onended = () => stopScreenShare();
      } catch (err) {
        console.warn(err);
      }
    } else {
      // Explicitly stop screen sharing when button clicked
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    if (!screenTrackRef.current) return;

    screenTrackRef.current.stop();
    screenTrackRef.current = null;

    if (cameraOn && localStream) {
      // Replace track with camera for all peers
      Object.values(peers.current).forEach((peer) => {
        const sender = peer.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(localStream.getVideoTracks()[0]);
      });

      if (myVideo.current) myVideo.current.srcObject = localStream;
    }

    setIsSharingScreen(false);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msgObj = { text: chatInput, timestamp: Date.now(), roomId: roomId || null };
    socket.current.emit("send-message", { roomId, message: msgObj });
    setMessages((prev) => [...prev, { ...msgObj, fromMe: true }]);
    setChatInput("");
  };

  const leaveCall = () => {
    localStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    Object.values(peers.current).forEach((p) => p.close());
    peers.current = {};
    setRemoteStreams({});
    socket.current.emit("leave-room", { roomId });
    setInCall(false);
    setRoomId("");
    setCameraOn(false);
    setMicOn(false);
    setIsMuted(false);
    setIsSharingScreen(false);
  };

  return (
    <div style={{ padding: 20 }}>
      {!inCall ? (
        <div style={{ textAlign: "center" }}>
          <h2>Start or Join a Meeting</h2>
          <div style={{ margin: "10px 0" }}>
            <button onClick={createRoom}>Create Meeting</button>
          </div>
          <div>
            <input
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter Meeting ID"
              style={{ padding: 6, marginRight: 8 }}
            />
            <button onClick={joinRoom}>Join Meeting</button>
          </div>
        </div>
      ) : (
        <div>
          <h3>Meeting: {roomId}</h3>
          <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
            <video
              ref={myVideo}
              autoPlay
              playsInline
              muted
              style={{ width: 320, height: 240, background: "#000", borderRadius: 8 }}
            />
            {Object.entries(remoteStreams).map(([id, stream]) => (
              <video
                key={id}
                autoPlay
                playsInline
                style={{ width: 320, height: 240, background: "#000", borderRadius: 8 }}
                ref={(video) => { if (video) video.srcObject = stream; }}
              />
            ))}

          </div>

          <div style={{ marginTop: 12 }}>
            {!cameraOn ? (
              <button onClick={startCamera} style={{ marginRight: 8 }}>Start Camera</button>
            ) : (
              <button onClick={toggleCamera} style={{ marginRight: 8 }}>Camera Off</button>
            )}

            {!micOn ? (
              <button onClick={startMic} style={{ marginRight: 8 }}>Start Mic</button>
            ) : (
              <button onClick={toggleMute} style={{ marginRight: 8 }}>
                {isMuted ? "Unmute" : "Mute"}
              </button>
            )}

            <button onClick={toggleScreenShare} style={{ marginRight: 8 }}>
              {isSharingScreen ? "Stop Sharing" : "Share Screen"}
            </button>

            <button onClick={leaveCall} style={{ background: "#e53935", color: "#fff" }}>Leave</button>
          </div>

          <div style={{ marginTop: 16, maxWidth: 660 }}>
            <div
              style={{
                border: "1px solid #ddd",
                padding: 8,
                height: 200,
                overflowY: "auto",
                borderRadius: 6,
              }}
            >
              {messages.map((m, i) => (
                <div key={i} style={{ marginBottom: 6, textAlign: m.fromMe ? "right" : "left" }}>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    {new Date(m.timestamp).toLocaleTimeString()}
                  </div>
                  <div
                    style={{
                      display: "inline-block",
                      padding: "6px 8px",
                      borderRadius: 6,
                      background: m.fromMe ? "#cfe9ff" : "#f1f1f1",
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={sendMessage} style={{ display: "flex", marginTop: 8 }}>
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                style={{ flex: 1, padding: 8 }}
              />
              <button type="submit" style={{ marginLeft: 8 }}>Send</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoCall;
