import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Management from './components/Management';
import { io } from 'socket.io-client';

function App() {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    const socket = io('http://localhost:5000', {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('WebSocket connection opened');
    });

    socket.on('disconnect', () => {
      console.log('WebSocket connection closed');
    });

    socket.on('member_checked_in', (member) => {
      console.log('Member checked in:', member);
      setMembers((prevMembers) => {
        const updatedMembers = prevMembers.map((m) =>
          m.uid === member.uid ? member : m
        );
        return updatedMembers;
      });
    });

    socket.on('members_list', (membersList) => {
      setMembers(membersList);
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    return () => {
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, []);

  return (
    <>
      <Navbar />
      <Management members={members} />
    </>
  );
}

export default App;