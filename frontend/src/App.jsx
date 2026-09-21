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
import AuditLogHistory from './components/AuditLogHistory';
import Checkin from './components/Checkin';
import CheckinQr from './components/CheckinQr';
import api from './api/axios';
import { BASE_URL, DEPARTMENT_LABELS, isMemberInActiveInterview } from './config';

const TAB_TITLES = [
  { title: 'Duyệt hồ sơ vòng đơn', subtitle: 'Sàng lọc hồ sơ ứng viên đăng ký tuyển thành viên' },
  { title: 'Ứng viên đã duyệt', subtitle: 'Quản lý link xác nhận và mật khẩu phỏng vấn' },
  { title: 'Quản lý ứng viên', subtitle: 'Danh sách và điều phối luồng phỏng vấn trực tiếp' },
  { title: 'Bảng theo dõi phỏng vấn', subtitle: 'Trực quan hoá trạng thái các phòng phỏng vấn' },
  { title: 'Lịch sử thao tác', subtitle: 'Nhật ký toàn hệ thống, giữ lại cả hồ sơ đã bị xoá' },
  { title: 'Cấu hình & Website', subtitle: 'Thông số hệ thống và liên kết dịch vụ' },
];

// Validates JWT structure and expiry timestamp synchronously without network delay
function isValidJwtToken(token) {
  if (!token || typeof token !== 'string') return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(base64));
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return false; // Token expired
    }
    return true;
  } catch (e) {
    return false;
  }
}

function App() {
  const [members, setMembers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);

  // Synchronously compute initial auth state to completely eliminate the 1s UI flash
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token');
    if (tokenFromUrl && isValidJwtToken(tokenFromUrl)) {
      localStorage.setItem('token', tokenFromUrl);
      window.history.replaceState({}, '', window.location.pathname);
      return true;
    }
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      if (isValidJwtToken(storedToken)) {
        return true;
      }
      localStorage.removeItem('token');
    }
    return false;
  });
  const [socketConnected, setSocketConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { isOpen: isMobileMenuOpen, onOpen: onMobileMenuOpen, onClose: onMobileMenuClose } = useDisclosure();
  const { isOpen: isCheckinOpen, onOpen: onCheckinOpen, onClose: onCheckinClose } = useDisclosure();
  const { isOpen: isCheckinQrOpen, onOpen: onCheckinQrOpen, onClose: onCheckinQrClose } = useDisclosure();

  const toast = useToast();
  const eventSourceRef = useRef(null);
  const isDesktop = useBreakpointValue({ base: false, lg: true });
  // Distinguishes the very first SSE handshake (state already loaded by the
  // explicit fetchMembers() call below) from a later reconnect after a drop
  // (network blip, server restart, proxy idle-timeout). The broadcaster only
  // fans events out to listeners that are live at the time, so anything
  // announced while we were disconnected is gone for good — a reconnect has
  // to trigger a full resync or the dashboard silently drifts out of date.
  const hasConnectedOnceRef = useRef(false);
  // Rolling batch state for bursty 'member_added' events (e.g. many
  // candidates submitting the public application form around a deadline).
  // Instead of stacking one toast per candidate, a burst collapses into a
  // single toast that keeps updating with the running count.
  const memberAddedBatchRef = useRef({ count: 0, resetTimer: null });

  // Authentik OIDC redirect error handler and 401 session expiry listener
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth_error')) {
      toast({
        title: 'Đăng nhập thất bại',
        description: 'Không thể xác thực với Authentik SSO, vui lòng thử lại.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      window.history.replaceState({}, '', window.location.pathname);
    }

    const handleAuthExpired = () => {
      setIsAuthenticated(false);
      setCurrentUser(null);
      toast({
        title: 'Phiên đăng nhập đã hết hạn',
        description: 'Vui lòng đăng nhập lại để tiếp tục.',
        status: 'warning',
        duration: 3500,
        isClosable: true,
      });
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
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

  // Initialize Native Server-Sent Events (SSE) connection when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      try {
        const token = localStorage.getItem('token');
        const sseUrl = `${BASE_URL}/api/events${token ? `?token=${encodeURIComponent(token)}` : ''}`;
        const es = new EventSource(sseUrl);
        eventSourceRef.current = es;

        es.onopen = () => {
          setSocketConnected(true);
        };

        es.onerror = () => {
          setSocketConnected(false);
        };

        es.addEventListener('connected', () => {
          setSocketConnected(true);
          if (hasConnectedOnceRef.current) {
            // Reconnected after a drop: resync in case any events were
            // announced while we had no listener registered on the server.
            fetchMembers();
          } else {
            hasConnectedOnceRef.current = true;
          }
        });

        es.addEventListener('member_added', (e) => {
          try {
            const newMember = JSON.parse(e.data);
            setMembers((prev) => [...prev, newMember]);
            window.dispatchEvent(new CustomEvent('app:data-updated'));

            const batch = memberAddedBatchRef.current;
            batch.count += 1;
            const toastId = 'member-added-batch';
            const description =
              batch.count === 1
                ? `${newMember.name} vừa nộp đơn ứng tuyển`
                : `${batch.count} ứng viên vừa nộp đơn (mới nhất: ${newMember.name})`;
            if (toast.isActive(toastId)) {
              toast.update(toastId, {
                title: 'Hồ sơ mới nộp',
                description,
                status: 'info',
                duration: 3500,
              });
            } else {
              toast({
                id: toastId,
                title: 'Hồ sơ mới nộp',
                description,
                status: 'info',
                duration: 3500,
                isClosable: true,
              });
            }
            clearTimeout(batch.resetTimer);
            batch.resetTimer = setTimeout(() => {
              batch.count = 0;
            }, 4000);
          } catch (err) {
            console.error('Error parsing SSE member_added:', err);
          }
        });

        es.addEventListener('member_edited', (e) => {
          try {
            const updatedMember = JSON.parse(e.data);
            setMembers((prev) => prev.map((m) => (m.id === updatedMember.id ? updatedMember : m)));
            window.dispatchEvent(new CustomEvent('app:data-updated'));
          } catch (err) {
            console.error('Error parsing SSE member_edited:', err);
          }
        });

        es.addEventListener('member_deleted', (e) => {
          try {
            const data = JSON.parse(e.data);
            setMembers((prev) => prev.filter((m) => m.id !== data.id));
            window.dispatchEvent(new CustomEvent('app:data-updated'));
          } catch (err) {
            console.error('Error parsing SSE member_deleted:', err);
          }
        });

        es.addEventListener('member_checked_in', (e) => {
          try {
            const checkedInMember = JSON.parse(e.data);
            setMembers((prev) => prev.map((m) => (m.id === checkedInMember.id ? checkedInMember : m)));
            window.dispatchEvent(new CustomEvent('app:data-updated'));
            toast({
              title: 'Ứng viên Check-in',
              description: `${checkedInMember.name} đã check-in thành công`,
              status: 'success',
              duration: 3000,
              isClosable: true,
            });
          } catch (err) {
            console.error('Error parsing SSE member_checked_in:', err);
          }
        });

        es.addEventListener('member_interview_called', (e) => {
          try {
            const interviewMember = JSON.parse(e.data);
            setMembers((prev) => prev.map((m) => (m.id === interviewMember.id ? interviewMember : m)));
            window.dispatchEvent(new CustomEvent('app:data-updated'));
            toast({
              title: 'Gọi phỏng vấn',
              description: `${interviewMember.name} đã được gọi vào phòng phỏng vấn`,
              status: 'warning',
              duration: 3500,
              isClosable: true,
              position: 'top',
            });
          } catch (err) {
            console.error('Error parsing SSE member_interview_called:', err);
          }
        });

        es.addEventListener('member_interview_started', (e) => {
          try {
            const interviewMember = JSON.parse(e.data);
            setMembers((prev) => prev.map((m) => (m.id === interviewMember.id ? interviewMember : m)));
            window.dispatchEvent(new CustomEvent('app:data-updated'));
            toast({
              title: 'Phỏng vấn bắt đầu',
              description: `${interviewMember.name} (${DEPARTMENT_LABELS[interviewMember.specialist] || interviewMember.specialist}) đang phỏng vấn`,
              status: 'warning',
              duration: 3000,
              isClosable: true,
              position: 'top',
            });
          } catch (err) {
            console.error('Error parsing SSE member_interview_started:', err);
          }
        });

        es.addEventListener('member_interview_ended', (e) => {
          try {
            const interviewEndedMember = JSON.parse(e.data);
            setMembers((prev) => prev.map((m) => (m.id === interviewEndedMember.id ? interviewEndedMember : m)));
            window.dispatchEvent(new CustomEvent('app:data-updated'));
            toast({
              title: 'Phỏng vấn hoàn thành',
              description: `${interviewEndedMember.name} đã kết thúc lượt phỏng vấn`,
              status: 'success',
              duration: 3000,
              isClosable: true,
            });
          } catch (err) {
            console.error('Error parsing SSE member_interview_ended:', err);
          }
        });

        es.addEventListener('member_screening_passed', (e) => {
          try {
            const member = JSON.parse(e.data);
            setMembers((prev) => prev.map((m) => (m.id === member.id ? member : m)));
            window.dispatchEvent(new CustomEvent('app:data-updated'));
          } catch (err) {
            console.error('Error parsing SSE member_screening_passed:', err);
          }
        });

        es.addEventListener('member_screening_failed', (e) => {
          try {
            const member = JSON.parse(e.data);
            setMembers((prev) => prev.map((m) => (m.id === member.id ? member : m)));
            window.dispatchEvent(new CustomEvent('app:data-updated'));
          } catch (err) {
            console.error('Error parsing SSE member_screening_failed:', err);
          }
        });

        es.addEventListener('member_confirmed', (e) => {
          try {
            const member = JSON.parse(e.data);
            setMembers((prev) => prev.map((m) => (m.id === member.id ? member : m)));
            window.dispatchEvent(new CustomEvent('app:data-updated'));
            toast({
              title: 'Ứng viên xác nhận tham gia',
              description: `${member.name} đã xác nhận lịch phỏng vấn`,
              status: 'success',
              duration: 3500,
              isClosable: true,
            });
          } catch (err) {
            console.error('Error parsing SSE member_confirmed:', err);
          }
        });

        es.addEventListener('member_reschedule_requested', (e) => {
          try {
            const member = JSON.parse(e.data);
            setMembers((prev) => prev.map((m) => (m.id === member.id ? member : m)));
            window.dispatchEvent(new CustomEvent('app:data-updated'));
            toast({
              title: 'Yêu cầu đổi lịch phỏng vấn',
              description: `${member.name} vừa gửi yêu cầu đổi lịch`,
              status: 'warning',
              duration: 4000,
              isClosable: true,
            });
          } catch (err) {
            console.error('Error parsing SSE member_reschedule_requested:', err);
          }
        });

        fetchMembers();

        return () => {
          es.close();
          eventSourceRef.current = null;
          hasConnectedOnceRef.current = false;
          clearTimeout(memberAddedBatchRef.current.resetTimer);
          memberAddedBatchRef.current.count = 0;
        };
      } catch (error) {
        console.error('Error setting up SSE EventSource:', error);
      }
    }
  }, [isAuthenticated, toast]);

  // Sidebar badge statistics
  const stats = useMemo(() => {
    return {
      pending: members.filter((m) => m.state === 'Chờ duyệt').length,
      total: members.length,
      interviewing: members.filter(isMemberInActiveInterview).length,
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
            {/* Live SSE Status */}
            <Tooltip
              label={socketConnected ? 'Kết nối realtime SSE đang hoạt động' : 'Mất kết nối realtime'}
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
                <AuditLogHistory />
              </TabPanel>
              <TabPanel p={0}>
                <WebsiteManagement setActiveTab={setActiveTab} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </Flex>

      {/* Global Check-in Modals */}
      <Checkin isOpen={isCheckinOpen} onClose={onCheckinClose} setMembers={setMembers} />
      <CheckinQr isOpen={isCheckinQrOpen} onClose={onCheckinQrClose} setMembers={setMembers} />
    </Flex>
  );
}

export default App;