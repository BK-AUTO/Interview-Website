import { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Tabs,
  TabPanels,
  TabPanel,
  useColorModeValue,
  Drawer,
  DrawerContent,
  useBreakpointValue
} from '@chakra-ui/react';
import Navbar from './components/Navbar';
import Management from './components/Management';
import WebsiteManagement from './components/WebsiteManagement';
import Sidebar from './components/Sidebar';
import Login from './components/Login'; // Import the Login component
import Register from './components/Register'; // Import the Register component
import api from './api/axios'; // Import the Axios instance
import { BASE_URL } from './config'; // Import BASE_URL from config

function App() {
  const [members, setMembers] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const isDesktop = useBreakpointValue({ base: false, lg: true });

  useEffect(() => {
    if (isAuthenticated) {
      const fetchMembers = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await api.get('/members', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          setMembers(response.data);
        } catch (error) {
          console.error('Error fetching members:', error);
        }
      };

      fetchMembers();
    }
  }, [isAuthenticated]);

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