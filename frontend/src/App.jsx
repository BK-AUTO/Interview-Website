import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Flex,
  Tabs,
  TabPanels,
  TabPanel,
  Drawer,
  DrawerContent,
  useBreakpointValue,
  useToast,
  HStack,
  IconButton,
  Text,
  Button,
  useDisclosure,
  Tooltip,
} from '@chakra-ui/react';
import { HamburgerIcon, RepeatIcon } from '@chakra-ui/icons';
import { FaCheckCircle, FaQrcode } from 'react-icons/fa';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import Management from './components/Management';
import WebsiteManagement from './components/WebsiteManagement';
import InterviewTracker from './components/InterviewTracker';
import ApplicationScreening from './components/ApplicationScreening';
import ApprovedCandidates from './components/ApprovedCandidates';
import Checkin from './components/Checkin';
import CheckinQr from './components/CheckinQr';
import api from './api/axios';
import { BASE_URL } from './config';
import { io } from 'socket.io-client';

const TAB_TITLES = [
  { title: 'Duyệt hồ sơ vòng đơn', subtitle: 'Sàng lọc hồ sơ ứng viên đăng ký tuyển thành viên' },
  { title: 'Ứng viên đã duyệt', subtitle: 'Quản lý link xác nhận và mật khẩu phỏng vấn' },
  { title: 'Quản lý ứng viên', subtitle: 'Danh sách và điều phối luồng phỏng vấn trực tiếp' },
  { title: 'Bảng theo dõi phỏng vấn', subtitle: 'Trực quan hoá trạng thái các phòng phỏng vấn' },
  { title: 'Cấu hình & Website', subtitle: 'Thông số hệ thống và liên kết dịch vụ' },
];

function App() {
  const [members, setMembers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { isOpen: isMobileMenuOpen, onOpen: onMobileMenuOpen, onClose: onMobileMenuClose } = useDisclosure();
  const { isOpen: isCheckinOpen, onOpen: onCheckinOpen, onClose: onCheckinClose } = useDisclosure();
  const { isOpen: isCheckinQrOpen, onOpen: onCheckinQrOpen, onClose: onCheckinQrClose } = useDisclosure();

  const toast = useToast();
  const socketRef = useRef(null);
  const isDesktop = useBreakpointValue({ base: false, lg: true });

  // Authentik OIDC redirect callback handler (?token=<jwt>)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token');
    if (tokenFromUrl) {
      localStorage.setItem('token', tokenFromUrl);
      window.history.replaceState({}, '', window.location.pathname);
      setIsAuthenticated(true);
    } else if (params.get('auth_error')) {
      toast({
        title: 'Đăng nhập thất bại',
        description: 'Không thể xác thực với Authentik SSO, vui lòng thử lại.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (localStorage.getItem('token')) {
      setIsAuthenticated(true);
    }
  }, [toast]);

  // Fetch all members via REST
  const fetchMembers = async (showToast = false) => {
    setIsRefreshing(true);
    try {
      const response = await api.get('/api/members');
      setMembers(response.data);
      if (showToast) {
        toast({ title: 'Đã đồng bộ dữ liệu mới nhất', status: 'success', duration: 2000, isClosable: true });
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initialize WebSocket connection when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      try {
        socketRef.current = io(BASE_URL, {
          reconnectionAttempts: 5,
          timeout: 10000,
          transports: ['websocket', 'polling'],
        });
        const socket = socketRef.current;

        socket.on('connect', () => {
          setSocketConnected(true);
          socket.emit('request_update');
        });

        socket.on('disconnect', () => {
          setSocketConnected(false);
        });

        socket.on('connect_error', (error) => {
          setSocketConnected(false);
          console.error('Socket error:', error);
        });

        socket.on('member_added', (newMember) => {
          setMembers((prev) => [...prev, newMember]);
          toast({
            title: 'Hồ sơ mới nộp',
            description: `${newMember.name} vừa nộp đơn ứng tuyển`,
            status: 'info',
            duration: 3500,
            isClosable: true,
          });
        });

        socket.on('member_edited', (updatedMember) => {
          setMembers((prev) => prev.map((m) => (m.id === updatedMember.id ? updatedMember : m)));
        });

        socket.on('member_deleted', (data) => {
          setMembers((prev) => prev.filter((m) => m.id !== data.id));
        });

        socket.on('member_checked_in', (checkedInMember) => {
          setMembers((prev) => prev.map((m) => (m.id === checkedInMember.id ? checkedInMember : m)));
          toast({
            title: 'Ứng viên Check-in',
            description: `${checkedInMember.name} đã check-in thành công`,
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
        });

        socket.on('member_interview_called', (interviewMember) => {
          setMembers((prev) => prev.map((m) => (m.id === interviewMember.id ? interviewMember : m)));
          toast({
            title: 'Gọi phỏng vấn',
            description: `${interviewMember.name} đã được gọi vào phòng phỏng vấn`,
            status: 'warning',
            duration: 3500,
            isClosable: true,
            position: 'top',
          });
        });

        socket.on('member_interview_started', (interviewMember) => {
          setMembers((prev) => prev.map((m) => (m.id === interviewMember.id ? interviewMember : m)));
          toast({
            title: 'Phỏng vấn bắt đầu',
            description: `${interviewMember.name} (${interviewMember.specialist}) đang phỏng vấn`,
            status: 'warning',
            duration: 3000,
            isClosable: true,
            position: 'top',
          });
        });

        socket.on('member_interview_ended', (interviewEndedMember) => {
          setMembers((prev) => prev.map((m) => (m.id === interviewEndedMember.id ? interviewEndedMember : m)));
          toast({
            title: 'Phỏng vấn hoàn thành',
            description: `${interviewEndedMember.name} đã kết thúc lượt phỏng vấn`,
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
        });

        socket.on('member_screening_passed', (member) => {
          setMembers((prev) => prev.map((m) => (m.id === member.id ? member : m)));
        });

        socket.on('member_screening_failed', (member) => {
          setMembers((prev) => prev.map((m) => (m.id === member.id ? member : m)));
        });

        socket.on('member_confirmed', (member) => {
          setMembers((prev) => prev.map((m) => (m.id === member.id ? member : m)));
          toast({
            title: 'Ứng viên xác nhận tham gia',
            description: `${member.name} đã xác nhận lịch phỏng vấn`,
            status: 'success',
            duration: 3500,
            isClosable: true,
          });
        });

        socket.on('member_reschedule_requested', (member) => {
          setMembers((prev) => prev.map((m) => (m.id === member.id ? member : m)));
          toast({
            title: 'Yêu cầu đổi lịch phỏng vấn',
            description: `${member.name} vừa gửi yêu cầu đổi lịch`,
            status: 'warning',
            duration: 4000,
            isClosable: true,
          });
        });

        socket.on('members_list', (membersList) => {
          setMembers(membersList);
        });

        fetchMembers();

        return () => {
          socket.disconnect();
          socketRef.current = null;
        };
      } catch (error) {
        console.error('Error setting up socket:', error);
      }
    }
  }, [isAuthenticated, toast]);

  // Sidebar badge statistics
  const stats = useMemo(() => {
    return {
      pending: members.filter((m) => m.state === 'Chờ duyệt').length,
      total: members.length,
      interviewing: members.filter((m) => m.state === 'Đang phỏng vấn' || m.state === 'Gọi PV').length,
    };
  }, [members]);

  // Fetch current Authentik user profile
  useEffect(() => {
    if (isAuthenticated) {
      api.get('/api/auth/me')
        .then((res) => setCurrentUser(res.data))
        .catch((err) => console.error('Error fetching user profile:', err));
    } else {
      setCurrentUser(null);
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <Login />;
  }

  const currentTabInfo = TAB_TITLES[activeTab] || TAB_TITLES[0];

  return (
    <Flex h="100vh" bg="gray.50" overflow="hidden">
      {/* Desktop Sidebar (No Topbar) */}
      {isDesktop ? (
        <Sidebar
          isSidebarMinimized={isSidebarMinimized}
          setIsSidebarMinimized={setIsSidebarMinimized}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          stats={stats}
          currentUser={currentUser}
          onOpenCheckin={onCheckinOpen}
          onOpenCheckinQr={onCheckinQrOpen}
          onLogout={handleLogout}
        />
      ) : (
        <Drawer isOpen={isMobileMenuOpen} placement="left" onClose={onMobileMenuClose}>
          <DrawerContent bg="dark.850" maxW="280px">
            <Sidebar
              isSidebarMinimized={false}
              setIsSidebarMinimized={() => {}}
              activeTab={activeTab}
              setActiveTab={(tab) => {
                setActiveTab(tab);
                onMobileMenuClose();
              }}
              stats={stats}
              currentUser={currentUser}
              onOpenCheckin={() => {
                onCheckinOpen();
                onMobileMenuClose();
              }}
              onOpenCheckinQr={() => {
                onCheckinQrOpen();
                onMobileMenuClose();
              }}
              onLogout={handleLogout}
            />
          </DrawerContent>
        </Drawer>
      )}

      {/* Main Content Workspace */}
      <Flex flex="1" direction="column" h="100vh" overflow="hidden">
        {/* Integrated Workspace Header Bar */}
        <Flex
          h="60px"
          px={{ base: 4, md: 6 }}
          bg="whiteAlpha.800"
          backdropFilter="blur(8px)"
          borderBottom="1px"
          borderColor="gray.200"
          align="center"
          justify="space-between"
          flexShrink={0}
        >
          {/* Left: Mobile hamburger & Page Breadcrumb */}
          <HStack spacing={3}>
            {!isDesktop && (
              <IconButton
                aria-label="Open Menu"
                icon={<HamburgerIcon />}
                onClick={onMobileMenuOpen}
                size="sm"
                variant="ghost"
                color="gray.700"
              />
            )}
            <Box>
              <Text fontSize="sm" fontWeight="bold" color="gray.900" lineHeight="shorter">
                {currentTabInfo.title}
              </Text>
              <Text fontSize="11px" color="gray.400" display={{ base: 'none', sm: 'block' }}>
                {currentTabInfo.subtitle}
              </Text>
            </Box>
          </HStack>

          {/* Right: Realtime status, Quick Check-in & Refresh */}
          <HStack spacing={3}>
            {/* Live Socket Status */}
            <Tooltip
              label={socketConnected ? 'Kết nối realtime WebSocket đang hoạt động' : 'Mất kết nối realtime'}
              hasArrow
              bg="dark.800"
              color="white"
            >
              <HStack
                spacing={1.5}
                px={2.5}
                py={1}
                borderRadius="full"
                bg="gray.50"
                border="1px solid"
                borderColor="gray.200"
              >
                <Box
                  w="7px"
                  h="7px"
                  borderRadius="full"
                  bg={socketConnected ? 'primary.500' : 'danger.500'}
                  className={socketConnected ? 'live-pulse' : ''}
                />
                <Text fontSize="10px" fontWeight="bold" color={socketConnected ? 'primary.500' : 'danger.500'}>
                  {socketConnected ? 'LIVE' : 'OFFLINE'}
                </Text>
              </HStack>
            </Tooltip>

            {/* Quick Check-in Buttons (Header shortcuts) */}
            <Button
              size="xs"
              variant="outline"
              colorScheme="primary"
              leftIcon={<FaCheckCircle />}
              onClick={onCheckinOpen}
              display={{ base: 'none', md: 'inline-flex' }}
            >
              Check-in MSSV
            </Button>

            <Button
              size="xs"
              variant="outline"
              colorScheme="info"
              leftIcon={<FaQrcode />}
              onClick={onCheckinQrOpen}
              display={{ base: 'none', md: 'inline-flex' }}
            >
              Quét QR
            </Button>

            {/* Refresh Data */}
            <Tooltip label="Tải lại dữ liệu" hasArrow bg="dark.800" color="white">
              <IconButton
                aria-label="Refresh Data"
                icon={<RepeatIcon />}
                size="xs"
                variant="ghost"
                color="gray.500"
                _hover={{ color: 'gray.900', bg: 'gray.100' }}
                onClick={() => fetchMembers(true)}
                isLoading={isRefreshing}
              />
            </Tooltip>
          </HStack>
        </Flex>

        {/* Tab Panels Content Canvas */}
        <Box flex="1" p={{ base: 4, md: 6 }} overflowY="auto">
          <Tabs index={activeTab} onChange={setActiveTab} variant="unstyled" isLazy>
            <TabPanels>
              <TabPanel p={0}>
                <ApplicationScreening members={members} setMembers={setMembers} />
              </TabPanel>
              <TabPanel p={0}>
                <ApprovedCandidates members={members} setMembers={setMembers} />
              </TabPanel>
              <TabPanel p={0}>
                <Management members={members} setMembers={setMembers} />
              </TabPanel>
              <TabPanel p={0}>
                <InterviewTracker members={members} />
              </TabPanel>
              <TabPanel p={0}>
                <WebsiteManagement setActiveTab={setActiveTab} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </Flex>

      {/* Global Check-in Modals */}
      <Checkin isOpen={isCheckinOpen} onClose={onCheckinClose} />
      <CheckinQr isOpen={isCheckinQrOpen} onClose={onCheckinQrClose} />
    </Flex>
  );
}

export default App;