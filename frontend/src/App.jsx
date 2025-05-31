import { useState, useEffect, useRef } from 'react';
import {
  Box,
  useColorModeValue,
  useToast
} from '@chakra-ui/react';
import Navbar from './components/Navbar';
import Management from './components/Management';
import StatisticsPage from './components/StatisticsPage';
import ViewSelection from './components/ViewSelection';
import Login from './components/Login';
import Register from './components/Register';
import api from './api/axios';
import { BASE_URL } from './config';
import { io } from "socket.io-client"; // Import socket.io-client

function App() {
  const [members, setMembers] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [currentView, setCurrentView] = useState(null); // null (chưa chọn), 'checkin', 'statistics'
  const toast = useToast();
  const socketRef = useRef(null);

  // Initialize WebSocket connection when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // Create socket instance with better error handling
      try {
        socketRef.current = io(BASE_URL, {
          reconnectionAttempts: 5,
          timeout: 10000,
          transports: ['websocket', 'polling'] // Try WebSocket first, then polling
        });
        const socket = socketRef.current;
        
        // Handle connection events
        socket.on('connect', () => {
          console.log('Connected to WebSocket server');
          // Request latest data after connection
          socket.emit('request_update');
        });
        
        socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          toast({
            title: "Connection Error",
            description: "Failed to establish real-time connection. Some features may not work correctly.",
            status: "error",
            duration: 5000,
            isClosable: true,
          });
        });
        
        socket.on('disconnect', () => {
          console.log('Disconnected from WebSocket server');
        });
        
        // Handle member updates
        socket.on('member_added', (newMember) => {
          console.log('Member added:', newMember);
          setMembers(prevMembers => [...prevMembers, newMember]);
          toast({
            title: "New Member Added",
            description: `${newMember.name} has been added to the system.`,
            status: "info",
            duration: 3000,
            isClosable: true,
          });
        });
        
        socket.on('member_edited', (updatedMember) => {
          console.log('Member updated:', updatedMember);
          setMembers(prevMembers => 
            prevMembers.map(member => 
              member.id === updatedMember.id ? updatedMember : member
            )
          );
          toast({
            title: "Member Updated",
            description: `${updatedMember.name}'s information has been updated.`,
            status: "info",
            duration: 3000,
            isClosable: true,
          });
        });
        
        socket.on('member_deleted', (data) => {
          console.log('Member deleted:', data);
          setMembers(prevMembers => {
            const deletedMember = prevMembers.find(m => m.id === data.id);
            const memberName = deletedMember ? deletedMember.name : 'Unknown';
            
            toast({
              title: "Member Deleted",
              description: `${memberName} has been removed from the system.`,
              status: "warning",
              duration: 3000,
              isClosable: true,
            });
            
            return prevMembers.filter(member => member.id !== data.id);
          });
        });
        
        socket.on('member_checked_in', (checkedInMember) => {
          console.log('Member checked in:', checkedInMember);
          setMembers(prevMembers => 
            prevMembers.map(member => 
              member.id === checkedInMember.id ? checkedInMember : member
            )
          );
          toast({
            title: "Member Checked In",
            description: `${checkedInMember.name} has checked in.`,
            status: "success",
            duration: 3000,
            isClosable: true,
          });        });
        
        socket.on('members_list', (membersList) => {
          console.log('Received updated members list:', membersList);
          setMembers(membersList);
        });
        
        socket.on('error', (error) => {
          console.error('Socket error:', error);
          toast({
            title: "Connection Error",
            description: error.message || "An error occurred with the real-time connection",
            status: "error",
            duration: 5000,
            isClosable: true,
          });
        });
        
        // Fetch initial data via HTTP
        const fetchMembers = async () => {
          try {
            const response = await api.get('/api/members');
            setMembers(response.data);
            console.log("Fetched members via HTTP:", response.data);
          } catch (error) {
            console.error('Error fetching members:', error);
          }
        };

        fetchMembers();
        
        // Clean up on unmount
        return () => {
          socket.disconnect();
          socketRef.current = null;
        };
      } catch (error) {
        console.error('Error setting up socket connection:', error);
      }
    }
  }, [isAuthenticated, toast]);

  // Function để xử lý việc chọn giao diện
  const handleViewSelection = (viewType) => {
    setCurrentView(viewType);
    toast({
      title: "Chuyển giao diện thành công",
      description: `Đã chuyển sang giao diện ${viewType === 'checkin' ? 'Check-in' : 'Thống kê'}`,
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  if (!isAuthenticated) {
    return isRegistering ? (
      <Register setIsAuthenticated={setIsAuthenticated} />
    ) : (
      <Login setIsAuthenticated={setIsAuthenticated} setIsRegistering={setIsRegistering} />
    );
  }

  // Hiển thị màn hình chọn giao diện nếu chưa chọn
  if (!currentView) {
    return <ViewSelection onSelectView={handleViewSelection} />;
  }

  return (
    <Box h="100vh" overflow="hidden">
      <Navbar 
        currentView={currentView}
        onViewStatistics={() => setCurrentView('statistics')}
        onBackToCheckin={() => setCurrentView('checkin')}
        onBackToSelection={() => setCurrentView(null)}
      />
      <Box p={4} bg={useColorModeValue("gray.50", "gray.800")} overflowY="auto" h="calc(100vh - 120px)">
        {currentView === 'checkin' ? (
          <Management 
            members={members} 
            setMembers={setMembers}
          />
        ) : (
          <StatisticsPage 
            members={members}
          />
        )}
      </Box>
    </Box>
  );
}

export default App;