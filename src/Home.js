import React, { Component } from 'react';
import { Input, Button, IconButton } from '@material-ui/core';
import GitHubIcon from '@material-ui/icons/GitHub';
import "./Home.css";

class Home extends Component {
  constructor(props) {
    super(props);
    this.state = {
      url: ''
    };
  }

  handleChange = (e) => this.setState({ url: e.target.value });

  join = () => {
    if (this.state.url !== "") {
      const urlParts = this.state.url.split("/");
      window.location.href = `/${urlParts[urlParts.length - 1]}`;
    } else {
      const url = Math.random().toString(36).substring(2, 7);
      window.location.href = `/${url}`;
    }
  }

  render() {
    return (
      <div className="home-wrapper">
        {/* Top decorative panel with GitHub */}
        <div className="top-panel">
          <h2 className="top-title">Video Meeting</h2>
          <IconButton
            onClick={() => window.open("https://github.com/Aanandi05/Video-Calling-Application", "_blank")}
            className="github-btn"
          >
            <GitHubIcon fontSize="large" />
          </IconButton>
        </div>

        {/* Main hero section */}
        <section className="hero-section">
          <div className="hero-card">
            <h1 className="hero-title">Connect with Everyone</h1>
            <p className="hero-subtitle">
              Video conference website that lets you stay in touch with all your friends.
            </p>

            {/* Join/Create meeting */}
            <div className="meeting-panel">
              <p className="panel-title">Start or join a meeting</p>
              <Input
                placeholder="Enter URL"
                value={this.state.url}
                onChange={this.handleChange}
                className="meeting-input"
              />
              <Button
                variant="contained"
                className="meeting-btn"
                onClick={this.join}
              >
                Go
              </Button>
            </div>
          </div>
        </section>
      </div>
    );
  }
}

export default Home;
