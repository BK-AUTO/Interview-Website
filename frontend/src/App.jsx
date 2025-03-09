import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Flex,
  Tabs,
  TabPanels,
  TabPanel,
  useColorModeValue,
  Drawer,
  DrawerContent,
  useBreakpointValue,
  useToast
} from '@chakra-ui/react';
import Navbar from './components/Navbar';
import Management from './components/Management';
import WebsiteManagement from './components/WebsiteManagement';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import Register from './components/Register';
import api from './api/axios';
import { BASE_URL } from './config';
import { io } from "socket.io-client"; // Import socket.io-client
import InterviewTracker from './components/InterviewTracker';

function App() {
  const [members, setMembers] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const toast = useToast();
  const socketRef = useRef(null);

  const isDesktop = useBreakpointValue({ base: false, lg: true });

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
          });
        });
        
        socket.on('member_interview_called', (interviewMember) => {
          console.log('Member called for interview:', interviewMember);
          setMembers(prevMembers => 
            prevMembers.map(member => 
              member.id === interviewMember.id ? interviewMember : member
            )
          );
          toast({
            title: "Interview Call",
            description: `${interviewMember.name} has been called for interview.`,
            status: "warning",
            duration: 3000,
            isClosable: true,
            position: "top",
          });
        });

        socket.on('member_interview_started', (interviewMember) => {
          console.log('Interview started for member:', interviewMember);
          setMembers(prevMembers => 
            prevMembers.map(member => 
              member.id === interviewMember.id ? interviewMember : member
            )
          );
          toast({
            title: "Interview Started",
            description: `${interviewMember.name}'s interview has begun.`,
            status: "warning",
            duration: 3000,
            isClosable: true,
            position: "top",
          });
        });

        socket.on('member_interview_ended', (interviewEndedMember) => {
          console.log('Interview ended for member:', interviewEndedMember);
          setMembers(prevMembers => 
            prevMembers.map(member => 
              member.id === interviewEndedMember.id ? interviewEndedMember : member
            )
          );
          toast({
            title: "Interview Completed",
            description: `${interviewEndedMember.name}'s interview has been completed.`,
            status: "success",
            duration: 3000,
            isClosable: true,
          });
        });
        
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

  if (!isAuthenticated) {
    return isRegistering ? (
      <Register setIsAuthenticated={setIsAuthenticated} />
    ) : (
      <Login setIsAuthenticated={setIsAuthenticated} setIsRegistering={setIsRegistering} />
    );
  }

  return (
    <Box h="100vh" overflow="hidden">
      <Navbar />
      <Flex h="calc(100vh - 60px)">
        {isDesktop ? (
          <Sidebar
            isSidebarMinimized={isSidebarMinimized}
            setIsSidebarMinimized={setIsSidebarMinimized}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        ) : (
          <Drawer
            isOpen={!isSidebarMinimized}
            placement="left"
            onClose={() => setIsSidebarMinimized(true)}
          >
            <DrawerContent>
              <Sidebar
                isSidebarMinimized={isSidebarMinimized}
                setIsSidebarMinimized={setIsSidebarMinimized}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            </DrawerContent>
          </Drawer>
        )}
        
        <Box flex="1" p={4} bg={useColorModeValue("gray.50", "gray.800")} overflowY="auto">
          <Tabs index={activeTab} onChange={setActiveTab} variant="unstyled">
            <TabPanels>
              <TabPanel>
                <Management members={members} setMembers={setMembers} />
              </TabPanel>
              <TabPanel>
                <InterviewTracker members={members} />
              </TabPanel>
              <TabPanel>
                <WebsiteManagement setActiveTab={setActiveTab} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </Flex>
    </Box>
  );
}

export default App;