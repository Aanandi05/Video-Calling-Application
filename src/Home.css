import React, { Component } from 'react';
import { Input, Button, IconButton, Switch } from '@material-ui/core';
import GitHubIcon from '@material-ui/icons/GitHub';
import axios from 'axios';
import "./Home.css";

class Home extends Component {
  constructor(props) {
    super(props);
    this.state = {
      createPassword: '',
      joinPassword: '',
      darkMode: false, // Dark/Light mode
    };
  }

  handleChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  }

  toggleDarkMode = () => {
    this.setState({ darkMode: !this.state.darkMode });
  }

  // --- Existing functions ---
  createMeeting = async () => {
    try {
      const backendURL =
        process.env.NODE_ENV === "production"
          ? "/create-room"
          : "http://localhost:4001/create-room";

      const res = await axios.post(backendURL);
      const password = res.data.password;
      this.setState({ createPassword: password });
    } catch (err) {
      alert("Error creating meeting");
      console.error(err);
    }
  }

  goToCreatedMeeting = () => {
    const { createPassword } = this.state;
    if (createPassword) {
      window.location.href = `/${createPassword}`;
    }
  }

  joinMeeting = async () => {
    const { joinPassword } = this.state;
    if (!joinPassword) return alert("Please enter the meeting password");

    try {
      const backendURL =
        process.env.NODE_ENV === "production"
          ? "/join-room"
          : "http://localhost:4001/join-room";

      const res = await axios.post(backendURL, { password: joinPassword });
      if (res.data.success) {
        window.location.href = `/${joinPassword}`;
      }
    } catch (err) {
      alert(err.response?.data?.message || "Error joining meeting");
    }
  }

  copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert("Copied to clipboard!");
    }).catch(() => {
      alert("Failed to copy");
    });
  }

  render() {
    const { createPassword, joinPassword, darkMode } = this.state;
    const wrapperClass = darkMode ? "home-wrapper dark" : "home-wrapper";

    return (
      <div className={wrapperClass}>
        <div className="top-panel">
          <h2 className="top-title">Video Meeting</h2>
          <div>
            {/* Dark/Light Mode Toggle */}
            <span style={{ marginRight: '10px', fontSize: '0.9rem' }}>
              {darkMode ? "Dark Mode" : "Light Mode"}
            </span>
            <Switch
              checked={darkMode}
              onChange={this.toggleDarkMode}
              color="secondary"
            />
            <IconButton
              onClick={() => window.open("https://github.com/Aanandi05/Video-Calling-Application", "_blank")}
              className="github-btn"
            >
              <GitHubIcon fontSize="large" />
            </IconButton>
          </div>
        </div>

        <section className="hero-section">
          <div className="hero-card">
            <h1 className="hero-title">Connect with Everyone</h1>
            <p className="hero-subtitle">
              Video conference website that lets you stay in touch with all your friends.
            </p>

            {/* Create Meeting Panel */}
            <div className="meeting-panel">
              <p className="panel-title">Create a Meeting</p>
              {createPassword ? (
                <>
                  <p style={{ color: '#ff69b4', fontWeight: 'bold' }}>Meeting Created!</p>
                  <p style={{ color: '#ff85c1' }}>
                    Password: <b>{createPassword}</b>{" "}
                    <Button size="small" onClick={() => this.copyToClipboard(createPassword)}>Copy</Button>
                  </p>
                  <Button
                    variant="contained"
                    className="meeting-btn"
                    onClick={this.goToCreatedMeeting}
                  >
                    Enter Meeting
                  </Button>
                </>
              ) : (
                <Button
                  variant="contained"
                  className="meeting-btn"
                  onClick={this.createMeeting}
                >
                  Create Meeting
                </Button>
              )}
            </div>

            <hr style={{ width: '80%', margin: '30px auto', borderColor: '#ffb6c1' }} />

            {/* Join Meeting Panel */}
            <div className="meeting-panel">
              <p className="panel-title">Join a Meeting</p>
              <Input
                placeholder="Meeting Password"
                name="joinPassword"
                value={joinPassword}
                onChange={this.handleChange}
                className="meeting-input"
              />
              <Button
                variant="contained"
                className="meeting-btn"
                onClick={this.joinMeeting}
                style={{ marginTop: '10px' }}
              >
                Join Meeting
              </Button>
            </div>
          </div>
        </section>
      </div>
    );
  }
}

export default Home;
