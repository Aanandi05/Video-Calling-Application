import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MeetingForm from './components/meetingform';
import VideoCall from './components/videocall';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MeetingForm />} />
        <Route path="/meeting/:meetingId" element={<VideoCall />} />
      </Routes>
    </Router>
  );
}

export default App;
