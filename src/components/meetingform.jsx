import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';

const MeetingForm = () => {
  const navigate = useNavigate();

  const createMeeting = () => {
    const meetingId = uuidv4();
    navigate(`/meeting/${meetingId}`);
  };

  const joinMeeting = e => {
    e.preventDefault();
    const meetingId = e.target.meetingId.value;
    if (meetingId) navigate(`/meeting/${meetingId}`);
  };

  return (
    <div>
      <h2>Create or Join a Meeting</h2>
      <button onClick={createMeeting}>Create Meeting</button>
      <form onSubmit={joinMeeting}>
        <input type="text" name="meetingId" placeholder="Enter Meeting ID" />
        <button type="submit">Join Meeting</button>
      </form>
    </div>
  );
};

export default MeetingForm;
