import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  Text,
  Box,
  Flex,
  HStack,
  VStack,
  Badge,
  Divider,
  SimpleGrid,
  Spinner,
  IconButton,
  Tooltip,
  Link,
  useToast,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuOptionGroup,
  MenuDivider,
} from '@chakra-ui/react';
import {
  FaIdCard,
  FaPhoneAlt,
  FaEnvelope,
  FaGraduationCap,
  FaLayerGroup,
  FaFilePdf,
  FaHistory,
  FaSyncAlt,
  FaExternalLinkAlt,
  FaLock,
  FaCheckCircle,
  FaInfoCircle,
  FaArrowRight,
  FaKey,
  FaCopy,
  FaLink,
} from 'react-icons/fa';
import api from '../api/axios';
import {
  DEPARTMENT_LABELS,
  TRACK_LABELS,
  ACTION_ICONS,
  ACTION_COLORS,
  SUB_DEPARTMENT_STATES,
  SUB_DEPARTMENT_STATE_PROPS,
  SUB_SCREENING_STATES,
  SUB_INTERVIEW_STATES,
  parseSubDepartments,
  parseSubDepartmentStates,
  isSubDeptLocked,
  isSubDeptInterviewLocked,
  getSubDeptNextAction,
} from '../config';
import { openCandidateCV } from '../utils/cvCache';

const STATE_BADGE_PROPS = {
  'Chờ duyệt': { bg: 'gray.100', color: 'gray.600', borderColor: 'gray.200' },
  'Đậu vòng đơn': { bg: 'rgba(24, 144, 255, 0.12)', color: 'info.600', borderColor: 'rgba(24, 144, 255, 0.3)' },
  'Trượt vòng đơn': { bg: 'rgba(245, 34, 45, 0.12)', color: 'danger.600', borderColor: 'rgba(245, 34, 45, 0.3)' },
  'Đã xác nhận': { bg: 'rgba(58, 197, 105, 0.12)', color: 'primary.600', borderColor: 'rgba(58, 197, 105, 0.3)' },
  'Xin đổi lịch': { bg: 'rgba(250, 173, 20, 0.12)', color: 'warning.700', borderColor: 'rgba(250, 173, 20, 0.3)' },
  'Chưa checkin': { bg: 'gray.100', color: 'gray.500', borderColor: 'gray.200' },
  'Đã checkin': { bg: 'rgba(82, 196, 26, 0.12)', color: 'success.700', borderColor: 'rgba(82, 196, 26, 0.3)' },
  'Gọi PV': { bg: 'rgba(250, 173, 20, 0.12)', color: 'warning.700', borderColor: 'rgba(250, 173, 20, 0.3)' },
  'Đang phỏng vấn': { bg: 'rgba(114, 46, 209, 0.12)', color: 'secondary.600', borderColor: 'rgba(114, 46, 209, 0.35)' },
  'Đã phỏng vấn': { bg: 'rgba(58, 197, 105, 0.12)', color: 'primary.600', borderColor: 'rgba(58, 197, 105, 0.3)' },
};

const CandidateDetailModal = ({ isOpen, onClose, candidate, members, setMembers }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  // Sync candidate data with live members state when updates arrive
  const liveCandidate = useMemo(() => {
    if (!candidate?.id) return candidate;
    return members?.find((m) => m.id === candidate.id) || candidate;
  }, [members, candidate]);

  const fetchLogs = useCallback(async () => {
    if (!liveCandidate?.id) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/members/${liveCandidate.id}/audit-logs`);
      setLogs(res.data || []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      toast({
        title: 'Không thể tải lịch sử thao tác',
        description: err.response?.data?.error || err.message,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }, [liveCandidate?.id, toast]);

  useEffect(() => {
    if (isOpen && liveCandidate?.id) {
      fetchLogs();
    } else {
      setLogs([]);
    }
  }, [isOpen, liveCandidate?.id, fetchLogs]);

  const handleAdvanceMainState = async () => {
    if (!liveCandidate) return;
    let nextState = '';
    if (liveCandidate.state === 'Đã checkin') nextState = 'Gọi PV';
    else if (liveCandidate.state === 'Gọi PV') nextState = 'Đang phỏng vấn';
    else if (liveCandidate.state === 'Đang phỏng vấn') nextState = 'Đã phỏng vấn';
    else return;

    try {
      const res = await api.put(`/api/members/${liveCandidate.id}`, { state: nextState });
      if (setMembers) {
        setMembers((prev) => prev.map((m) => (m.id === liveCandidate.id ? res.data.member : m)));
      }
      toast({ title: `Mảng chính: ${nextState}`, status: 'info', duration: 2500, isClosable: true });
      fetchLogs();
    } catch (err) {
      toast({
        title: 'Lỗi cập nhật',
        description: err.response?.data?.error || err.response?.data?.message || err.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleUpdateSubDeptState = async (subKey, newSubState) => {
    if (!liveCandidate) return;
    const subStates = parseSubDepartmentStates(liveCandidate.sub_department_states);
    const updated = { ...subStates, [subKey]: newSubState };
    try {
      const res = await api.put(`/api/members/${liveCandidate.id}`, {
        sub_department_states: updated,
      });
      if (setMembers) {
        setMembers((prev) => prev.map((m) => (m.id === liveCandidate.id ? res.data.member : m)));
      }
      toast({
        title: `Mảng phụ [${DEPARTMENT_LABELS[subKey] || subKey}]: ${newSubState}`,
        status: 'success',
        duration: 2500,
        isClosable: true,
      });
      fetchLogs();
    } catch (err) {
      toast({
        title: 'Lỗi cập nhật',
        description: err.response?.data?.error || err.response?.data?.message || err.message,
        status: 'error',
        duration: 3500,
        isClosable: true,
      });
    }
  };

  if (!liveCandidate) return null;

  const stateProps = STATE_BADGE_PROPS[liveCandidate.state] || {
    bg: 'gray.100',
    color: 'gray.600',
    borderColor: 'gray.200',
  };

  const parseSubDepts = () => {
    try {
      if (!liveCandidate.sub_departments) return [];
      const parsed = typeof liveCandidate.sub_departments === 'string'
        ? JSON.parse(liveCandidate.sub_departments)
        : liveCandidate.sub_departments;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const subDepts = parseSubDepts();

  let mainAdvanceLabel = null;
  let mainAdvanceColor = 'primary';
  if (liveCandidate.state === 'Đã checkin') {
    mainAdvanceLabel = 'Gọi PV';
    mainAdvanceColor = 'warning';
  } else if (liveCandidate.state === 'Gọi PV') {
    mainAdvanceLabel = 'Bắt đầu PV';
    mainAdvanceColor = 'secondary';
  } else if (liveCandidate.state === 'Đang phỏng vấn') {
    mainAdvanceLabel = 'Kết thúc PV';
    mainAdvanceColor = 'success';
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(4px)" />
      <ModalContent
        bg="white"
        borderWidth="1px"
        borderColor="gray.200"
        color="gray.900"
        borderRadius="xl"
        maxW={{ base: '95%', md: '750px' }}
      >
        <ModalHeader borderBottomWidth="1px" borderColor="gray.200" pb={4}>
          <Flex justify="space-between" align="center" pr={6}>
            <HStack spacing={3}>
              <Box
                w="42px"
                h="42px"
                borderRadius="lg"
                bg="rgba(58, 197, 105, 0.12)"
                borderWidth="1px"
                borderColor="rgba(58, 197, 105, 0.3)"
                display="flex"
                alignItems="center"
                justifyContent="center"
                color="primary.500"
                fontWeight="bold"
                fontSize="lg"
              >
                {liveCandidate.name ? liveCandidate.name.trim().slice(-1) : 'U'}
              </Box>
              <Box>
                <HStack spacing={2}>
                  <Text fontSize="lg" fontWeight="bold" color="gray.900">
                    {liveCandidate.name}
                  </Text>
                  <Badge
                    fontSize="11px"
                    px={2}
                    py={0.5}
                    borderRadius="md"
                    borderWidth="1px"
                    bg={liveCandidate.application_track === 'media' ? 'rgba(250, 140, 22, 0.12)' : 'rgba(24, 144, 255, 0.12)'}
                    color={liveCandidate.application_track === 'media' ? 'orange.600' : 'info.600'}
                    borderColor={liveCandidate.application_track === 'media' ? 'rgba(250, 140, 22, 0.3)' : 'rgba(24, 144, 255, 0.3)'}
                  >
                    {TRACK_LABELS[liveCandidate.application_track] || (liveCandidate.application_track === 'media' ? 'Truyền thông' : 'Kỹ thuật')}
                  </Badge>
                  <Badge
                    fontSize="11px"
                    px={2}
                    py={0.5}
                    borderRadius="md"
                    borderWidth="1px"
                    bg={stateProps.bg}
                    color={stateProps.color}
                    borderColor={stateProps.borderColor}
                  >
                    {liveCandidate.state}
                  </Badge>
                </HStack>
                <Text fontSize="xs" color="gray.500">
                  {liveCandidate.student_type === 'external' ? `Trường: ${liveCandidate.school || liveCandidate.MSSV}` : `MSSV: ${liveCandidate.MSSV}`}
                  {' • '}Mảng: {DEPARTMENT_LABELS[liveCandidate.specialist] || liveCandidate.specialist || 'Chung'}
                </Text>
              </Box>
            </HStack>
          </Flex>
        </ModalHeader>
        <ModalCloseButton color="gray.500" _hover={{ color: 'gray.900' }} />

        <ModalBody py={5}>
          {/* Section 1: Candidate Full Info */}
          <Box mb={6}>
            <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="gray.400" mb={3}>
              Thông tin ứng viên
            </Text>
            <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
              <Box p={3} borderRadius="lg" bg="gray.50" borderWidth="1px" borderColor="gray.200">
                <HStack spacing={2} color="gray.500" fontSize="xs" mb={1}>
                  <FaIdCard />
                  <Text>{liveCandidate.student_type === 'external' ? 'Trường đang theo học' : 'MSSV / Mã định danh'}</Text>
                </HStack>
                <Text fontSize="sm" fontWeight="semibold" color="gray.900">
                  {liveCandidate.student_type === 'external' ? (liveCandidate.school || liveCandidate.MSSV) : liveCandidate.MSSV}
                </Text>
              </Box>

              <Box p={3} borderRadius="lg" bg="gray.50" borderWidth="1px" borderColor="gray.200">
                <HStack spacing={2} color="gray.500" fontSize="xs" mb={1}>
                  <FaPhoneAlt />
                  <Text>Số điện thoại</Text>
                </HStack>
                <Text fontSize="sm" fontWeight="semibold" color="gray.900">
                  {liveCandidate.phone || 'Chưa cập nhật'}
                </Text>
              </Box>

              <Box p={3} borderRadius="lg" bg="gray.50" borderWidth="1px" borderColor="gray.200">
                <HStack spacing={2} color="gray.500" fontSize="xs" mb={1}>
                  <FaEnvelope />
                  <Text>Email</Text>
                </HStack>
                <Text fontSize="sm" fontWeight="semibold" color="gray.900" isTruncated>
                  {liveCandidate.email || 'Chưa cập nhật'}
                </Text>
              </Box>

              <Box p={3} borderRadius="lg" bg="gray.50" borderWidth="1px" borderColor="gray.200">
                <HStack spacing={2} color="gray.500" fontSize="xs" mb={1}>
                  <FaGraduationCap />
                  <Text>Lớp / Chuyên ngành</Text>
                </HStack>
                <Text fontSize="sm" fontWeight="semibold" color="gray.900">
                  {liveCandidate.major_class || 'Chưa cập nhật'}
                  {liveCandidate.student_type === 'hust' ? ' (HUST)' : liveCandidate.student_type === 'external' ? ' (Ngoài HUST)' : ''}
                </Text>
              </Box>

              <Box p={3} borderRadius="lg" bg="gray.50" borderWidth="1px" borderColor="gray.200">
                <HStack spacing={2} color="gray.500" fontSize="xs" mb={1}>
                  <FaLayerGroup />
                  <Text>Mảng chuyên môn chính</Text>
                </HStack>
                <Badge colorScheme="primary" variant="subtle" fontSize="xs" borderRadius="md" px={2}>
                  {DEPARTMENT_LABELS[liveCandidate.specialist] || liveCandidate.specialist || 'Chung'}
                </Badge>
                {subDepts.length > 0 && (
                  <HStack spacing={1} mt={1.5} flexWrap="wrap">
                    {subDepts.map((d, i) => (
                      <Badge key={i} size="sm" variant="outline" fontSize="10px" colorScheme="gray">
                        {DEPARTMENT_LABELS[d] || d}
                      </Badge>
                    ))}
                  </HStack>
                )}
              </Box>

              <Box p={3} borderRadius="lg" bg="gray.50" borderWidth="1px" borderColor="gray.200">
                <HStack spacing={2} color="gray.500" fontSize="xs" mb={1}>
                  <FaFilePdf />
                  <Text>Hồ sơ CV</Text>
                </HStack>
                {liveCandidate.linkCV ? (
                  <Button
                    size="xs"
                    variant="link"
                    colorScheme="primary"
                    fontWeight="medium"
                    display="inline-flex"
                    alignItems="center"
                    gap={1.5}
                    onClick={() => openCandidateCV(liveCandidate.linkCV, toast)}
                  >
                    Xem file CV <FaExternalLinkAlt size={10} />
                  </Button>
                ) : (
                  <Text fontSize="sm" color="gray.400">Không có CV</Text>
                )}
              </Box>
            </SimpleGrid>

            {liveCandidate.reschedule_request && (
              <Box mt={3} p={3} borderRadius="lg" bg="rgba(250, 173, 20, 0.08)" borderWidth="1px" borderColor="rgba(250, 173, 20, 0.25)">
                <Text fontSize="xs" fontWeight="bold" color="warning.700" mb={1}>
                  ⚠️ Lý do xin đổi lịch:
                </Text>
                <Text fontSize="xs" color="gray.700">
                  {liveCandidate.reschedule_request}
                </Text>
              </Box>
            )}

            {liveCandidate.note && (
              <Box mt={3} p={3} borderRadius="lg" bg="gray.50" borderWidth="1px" borderColor="gray.200">
                <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>
                  Câu hỏi / Ghi chú từ ứng viên:
                </Text>
                <Text fontSize="xs" color="gray.700" whiteSpace="pre-wrap">
                  {liveCandidate.note}
                </Text>
              </Box>
            )}

            {/* Thông tin link xác nhận và mã 6 số */}
            {(liveCandidate.confirm_token || liveCandidate.confirm_password) && (
              <Box mt={3} p={3.5} borderRadius="lg" bg="teal.50" borderWidth="1px" borderColor="teal.200">
                <HStack justify="space-between" mb={2.5}>
                  <HStack spacing={2}>
                    <FaKey color="#0d9488" size={13} />
                    <Text fontSize="xs" fontWeight="bold" color="teal.800" textTransform="uppercase" letterSpacing="wide">
                      Xác nhận phỏng vấn & Mã 6 số
                    </Text>
                  </HStack>
                  <Badge
                    fontSize="11px"
                    colorScheme={liveCandidate.confirmed_at ? 'green' : liveCandidate.confirm_token ? 'blue' : 'gray'}
                    px={2}
                    py={0.5}
                    borderRadius="md"
                  >
                    {liveCandidate.confirmed_at ? `Đã xác nhận (${liveCandidate.confirmed_at})` : 'Chờ xác nhận'}
                  </Badge>
                </HStack>

                <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={2.5}>
                  <Box bg="white" p={2.5} borderRadius="md" borderWidth="1px" borderColor="teal.100">
                    <Text fontSize="11px" color="gray.500" mb={1} fontWeight="medium">Link xác nhận cá nhân</Text>
                    <HStack spacing={2} justify="space-between">
                      <Text fontSize="xs" color="teal.700" isTruncated maxW="180px">
                        {liveCandidate.confirm_url || (liveCandidate.confirm_token ? `${window.location.origin}/confirm/${liveCandidate.confirm_token}` : 'Chưa cấp')}
                      </Text>
                      {liveCandidate.confirm_token && (
                        <HStack spacing={1}>
                          <Tooltip label="Sao chép link xác nhận" hasArrow>
                            <IconButton
                              size="xs"
                              aria-label="Copy link"
                              icon={<FaCopy />}
                              variant="ghost"
                              colorScheme="teal"
                              onClick={() => {
                                const linkToCopy = liveCandidate.confirm_url || `${window.location.origin}/confirm/${liveCandidate.confirm_token}`;
                                navigator.clipboard.writeText(linkToCopy);
                                toast({ title: 'Đã sao chép link xác nhận', status: 'success', duration: 1800, isClosable: true });
                              }}
                            />
                          </Tooltip>
                          <Tooltip label="Mở trang xác nhận" hasArrow>
                            <IconButton
                              as="a"
                              href={liveCandidate.confirm_url || `${window.location.origin}/confirm/${liveCandidate.confirm_token}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              size="xs"
                              aria-label="Mở link"
                              icon={<FaExternalLinkAlt />}
                              variant="ghost"
                              colorScheme="teal"
                            />
                          </Tooltip>
                        </HStack>
                      )}
                    </HStack>
                  </Box>

                  <Box bg="white" p={2.5} borderRadius="md" borderWidth="1px" borderColor="teal.100">
                    <Text fontSize="11px" color="gray.500" mb={1} fontWeight="medium">Mã xác nhận (6 số raw)</Text>
                    <HStack spacing={2} justify="space-between">
                      <Text fontSize="md" fontWeight="bold" fontFamily="monospace" letterSpacing="widest" color="teal.800">
                        {liveCandidate.confirm_password || 'Chưa tạo'}
                      </Text>
                      {liveCandidate.confirm_password && (
                        <Tooltip label="Sao chép mã 6 số" hasArrow>
                          <IconButton
                            size="xs"
                            aria-label="Copy mã xác nhận"
                            icon={<FaCopy />}
                            variant="ghost"
                            colorScheme="teal"
                            onClick={() => {
                              navigator.clipboard.writeText(liveCandidate.confirm_password);
                              toast({ title: 'Đã sao chép mã 6 số', status: 'success', duration: 1800, isClosable: true });
                            }}
                          />
                        </Tooltip>
                      )}
                    </HStack>
                  </Box>
                </SimpleGrid>
              </Box>
            )}
          </Box>

          <Divider borderColor="gray.200" mb={5} />

          {/* Section 2: Dual Interview Flows (Main Department & Sub-Departments) */}
          <Box mb={6}>
            <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="gray.400" mb={3}>
              Tiến trình 2 flow phỏng vấn độc lập
            </Text>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              {/* Flow Mảng chính */}
              <Box p={4} borderRadius="xl" bg="gray.50" borderWidth="1px" borderColor="gray.200">
                <HStack justify="space-between" align="center" mb={2}>
                  <HStack spacing={2}>
                    <Badge colorScheme="primary" fontSize="xs" px={2} py={0.5} borderRadius="md">
                      Mảng chính
                    </Badge>
                    <Text fontSize="sm" fontWeight="bold" color="gray.900">
                      {DEPARTMENT_LABELS[liveCandidate.specialist] || liveCandidate.specialist || 'Chung'}
                    </Text>
                  </HStack>
                </HStack>

                <HStack spacing={2} mb={3} align="center">
                  <Text fontSize="xs" color="gray.500">Trạng thái:</Text>
                  <Badge
                    fontSize="xs"
                    px={2}
                    py={0.5}
                    borderRadius="md"
                    borderWidth="1px"
                    bg={stateProps.bg}
                    color={stateProps.color}
                    borderColor={stateProps.borderColor}
                  >
                    {liveCandidate.state}
                  </Badge>
                </HStack>

                {/* Main Department Advance Button & State Selector */}
                {mainAdvanceLabel && (
                  <Button
                    size="xs"
                    colorScheme={mainAdvanceColor}
                    rightIcon={<FaArrowRight />}
                    w="full"
                    mb={2}
                    onClick={handleAdvanceMainState}
                  >
                    {mainAdvanceLabel}
                  </Button>
                )}

                <Menu size="sm" isLazy>
                  <MenuButton as={Button} size="xs" colorScheme="primary" variant="outline" w="full" rightIcon={<FaSyncAlt size={10} />}>
                    Đổi trạng thái mảng chính
                  </MenuButton>
                  <MenuList fontSize="xs" zIndex={10}>
                    {['Chờ duyệt', 'Đậu vòng đơn', 'Đã xác nhận', 'Đã checkin', 'Gọi PV', 'Đang phỏng vấn', 'Đã phỏng vấn', 'Trượt vòng đơn'].map((st) => (
                      <MenuItem
                        key={st}
                        onClick={async () => {
                          try {
                            const res = await api.put(`/api/members/${liveCandidate.id}`, { state: st });
                            if (setMembers) {
                              setMembers((prev) => prev.map((m) => (m.id === liveCandidate.id ? res.data.member : m)));
                            }
                            toast({ title: `Mảng chính: ${st}`, status: 'info', duration: 2500, isClosable: true });
                            fetchLogs();
                          } catch (err) {
                            toast({ title: 'Lỗi cập nhật', description: err.message, status: 'error', duration: 3000, isClosable: true });
                          }
                        }}
                        fontWeight={liveCandidate.state === st ? 'bold' : 'normal'}
                        bg={liveCandidate.state === st ? 'primary.50' : 'transparent'}
                        color={liveCandidate.state === st ? 'primary.600' : 'gray.800'}
                      >
                        {st}
                      </MenuItem>
                    ))}
                  </MenuList>
                </Menu>
              </Box>

              {/* Flow Các Mảng phụ */}
              <Box p={4} borderRadius="xl" bg="gray.50" borderWidth="1px" borderColor="gray.200">
                <HStack justify="space-between" align="center" mb={3}>
                  <HStack spacing={2}>
                    <Badge colorScheme="purple" fontSize="xs" px={2} py={0.5} borderRadius="md">
                      Mảng phụ
                    </Badge>
                    <Text fontSize="sm" fontWeight="bold" color="gray.900">
                      {subDepts.length > 0 ? `${subDepts.length} mảng đã đăng ký` : 'Không có'}
                    </Text>
                  </HStack>
                  <Text fontSize="xs" color="gray.500">
                    Quy tắc: Duyệt sau mảng chính
                  </Text>
                </HStack>

                {/* Gate status banner */}
                {subDepts.length > 0 && (
                  isSubDeptLocked(liveCandidate.state) ? (
                    <Flex p={2.5} mb={3} bg="gray.100" borderRadius="md" align="center" gap={2} borderWidth="1px" borderColor="gray.200">
                      <Box color="gray.500"><FaLock size={12} /></Box>
                      <Text fontSize="xs" color="gray.600">
                        <strong>Đang khoá duyệt mảng phụ:</strong> Mảng chính (<strong>{DEPARTMENT_LABELS[liveCandidate.specialist] || liveCandidate.specialist}</strong>) cần được duyệt <em>Đậu vòng đơn</em> trước.
                      </Text>
                    </Flex>
                  ) : isSubDeptInterviewLocked(liveCandidate.state) ? (
                    <Flex p={2.5} mb={3} bg="blue.50" borderRadius="md" align="center" gap={2} borderWidth="1px" borderColor="blue.100">
                      <Box color="blue.500"><FaInfoCircle size={12} /></Box>
                      <Text fontSize="xs" color="blue.700">
                        <strong>Đang mở duyệt hồ sơ:</strong> Có thể duyệt Đậu/Trượt đơn mảng phụ. Vòng phỏng vấn sẽ mở sau khi mảng chính <em>Đã phỏng vấn</em>.
                      </Text>
                    </Flex>
                  ) : (
                    <Flex p={2.5} mb={3} bg="green.50" borderRadius="md" align="center" gap={2} borderWidth="1px" borderColor="green.200">
                      <Box color="green.600"><FaCheckCircle size={12} /></Box>
                      <Text fontSize="xs" color="green.700">
                        <strong>Đã mở toàn bộ flow:</strong> Mảng chính đã phỏng vấn xong. Mảng phụ có thể phỏng vấn ngay.
                      </Text>
                    </Flex>
                  )
                )}

                {subDepts.length === 0 ? (
                  <Text fontSize="xs" color="gray.400" fontStyle="italic" py={2}>
                    Ứng viên không đăng ký mảng chuyên môn phụ nào.
                  </Text>
                ) : (
                  <VStack spacing={2.5} align="stretch" mt={1}>
                    {subDepts.map((sub) => {
                      const subStates = parseSubDepartmentStates(liveCandidate.sub_department_states);
                      const currentSubState = subStates[sub] || 'Chờ duyệt';
                      const isLocked = isSubDeptLocked(liveCandidate.state);
                      const isInterviewLocked = isSubDeptInterviewLocked(liveCandidate.state);
                      const subStyle = SUB_DEPARTMENT_STATE_PROPS[currentSubState] || {
                        bg: 'gray.100',
                        color: 'gray.700',
                        borderColor: 'gray.200',
                      };
                      const nextAction = getSubDeptNextAction(liveCandidate.state, currentSubState);

                      return (
                        <Box
                          key={sub}
                          p={2.5}
                          borderRadius="md"
                          bg="white"
                          borderWidth="1px"
                          borderColor="gray.200"
                        >
                          <Flex justify="space-between" align="center" gap={2} flexWrap="wrap">
                            <Text fontSize="xs" fontWeight="semibold" color="gray.800">
                              {DEPARTMENT_LABELS[sub] || sub}
                            </Text>

                            <HStack spacing={1.5} align="center" flexWrap="wrap" justify="flex-end">
                              {isLocked ? (
                                <Tooltip
                                  label={`Mảng chính (${DEPARTMENT_LABELS[liveCandidate.specialist] || liveCandidate.specialist}) chưa đậu vòng đơn`}
                                  hasArrow
                                  placement="top"
                                >
                                  <Badge
                                    size="xs"
                                    h="24px"
                                    px={2.5}
                                    fontSize="11px"
                                    bg="gray.100"
                                    color="gray.400"
                                    borderWidth="1px"
                                    borderColor="gray.200"
                                    display="inline-flex"
                                    alignItems="center"
                                    gap={1.5}
                                    cursor="not-allowed"
                                  >
                                    <FaLock size={9} /> {currentSubState}
                                  </Badge>
                                </Tooltip>
                              ) : (
                                <Menu size="xs" isLazy>
                                  <MenuButton
                                    as={Button}
                                    size="xs"
                                    h="24px"
                                    px={2.5}
                                    fontSize="11px"
                                    bg={subStyle.bg}
                                    color={subStyle.color}
                                    borderWidth="1px"
                                    borderColor={subStyle.borderColor}
                                  >
                                    {currentSubState} ▾
                                  </MenuButton>
                                  <MenuList fontSize="xs" minW="160px" zIndex={10}>
                                    <MenuOptionGroup title="Vòng đơn" type="radio" value={currentSubState}>
                                      {SUB_SCREENING_STATES.map((st) => (
                                        <MenuItem
                                          key={st}
                                          onClick={() => handleUpdateSubDeptState(sub, st)}
                                          fontWeight={currentSubState === st ? 'bold' : 'normal'}
                                          bg={currentSubState === st ? 'primary.50' : 'transparent'}
                                          color={currentSubState === st ? 'primary.600' : 'gray.800'}
                                        >
                                          {st}
                                        </MenuItem>
                                      ))}
                                    </MenuOptionGroup>

                                    <MenuDivider />

                                    <MenuOptionGroup
                                      title={isInterviewLocked ? "Phỏng vấn (🔒 Chờ mảng chính)" : "Vòng phỏng vấn"}
                                      type="radio"
                                      value={currentSubState}
                                    >
                                      {SUB_INTERVIEW_STATES.map((st) => {
                                        const disabled = isInterviewLocked || currentSubState === 'Trượt vòng đơn';
                                        return (
                                          <MenuItem
                                            key={st}
                                            isDisabled={disabled}
                                            onClick={() => !disabled && handleUpdateSubDeptState(sub, st)}
                                            fontWeight={currentSubState === st ? 'bold' : 'normal'}
                                            bg={currentSubState === st ? 'primary.50' : 'transparent'}
                                            color={currentSubState === st ? 'primary.600' : (disabled ? 'gray.400' : 'gray.800')}
                                          >
                                            <HStack justify="space-between" w="full">
                                              <Text>{st}</Text>
                                              {disabled && <FaLock size={9} color="gray" />}
                                            </HStack>
                                          </MenuItem>
                                        );
                                      })}
                                    </MenuOptionGroup>
                                  </MenuList>
                                </Menu>
                              )}

                              {/* Sequential advance action buttons */}
                              {nextAction.type === 'screen' && (
                                <>
                                  <Button
                                    size="xs"
                                    h="24px"
                                    fontSize="11px"
                                    px={2}
                                    colorScheme="info"
                                    onClick={() => handleUpdateSubDeptState(sub, 'Đậu vòng đơn')}
                                  >
                                    Duyệt đậu
                                  </Button>
                                  <Button
                                    size="xs"
                                    h="24px"
                                    fontSize="11px"
                                    px={2}
                                    colorScheme="red"
                                    variant="ghost"
                                    onClick={() => handleUpdateSubDeptState(sub, 'Trượt vòng đơn')}
                                  >
                                    Trượt
                                  </Button>
                                </>
                              )}

                              {nextAction.type === 'advance' && (
                                <Button
                                  size="xs"
                                  h="24px"
                                  fontSize="11px"
                                  px={2}
                                  colorScheme={nextAction.colorScheme}
                                  rightIcon={<FaArrowRight />}
                                  onClick={() => handleUpdateSubDeptState(sub, nextAction.nextState)}
                                >
                                  {nextAction.label}
                                </Button>
                              )}

                              {nextAction.type === 'evaluate' && (
                                <>
                                  <Button
                                    size="xs"
                                    h="24px"
                                    fontSize="11px"
                                    px={2}
                                    colorScheme="primary"
                                    onClick={() => handleUpdateSubDeptState(sub, 'Đạt')}
                                  >
                                    Đạt
                                  </Button>
                                  <Button
                                    size="xs"
                                    h="24px"
                                    fontSize="11px"
                                    px={2}
                                    colorScheme="red"
                                    variant="outline"
                                    onClick={() => handleUpdateSubDeptState(sub, 'Không đạt')}
                                  >
                                    K.Đạt
                                  </Button>
                                </>
                              )}

                              {nextAction.type === 'locked' && !isLocked && (
                                <Tooltip label={nextAction.reason} hasArrow placement="top">
                                  <Badge
                                    fontSize="10px"
                                    h="22px"
                                    px={1.5}
                                    colorScheme="gray"
                                    display="inline-flex"
                                    alignItems="center"
                                    gap={1}
                                    cursor="not-allowed"
                                  >
                                    <FaLock size={8} /> {nextAction.label}
                                  </Badge>
                                </Tooltip>
                              )}
                            </HStack>
                          </Flex>
                        </Box>
                      );
                    })}
                  </VStack>
                )}
              </Box>
            </SimpleGrid>
          </Box>

          <Divider borderColor="gray.200" mb={5} />

          {/* Section 3: Audit Logs Timeline */}
          <Box>
            <Flex justify="space-between" align="center" mb={3}>
              <HStack spacing={2}>
                <Box as={FaHistory} color="primary.500" />
                <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="gray.400">
                  Lịch sử thao tác & Tiến trình ({logs.length})
                </Text>
              </HStack>
              <Tooltip label="Làm mới lịch sử" placement="top">
                <IconButton
                  icon={<FaSyncAlt />}
                  size="xs"
                  variant="ghost"
                  color="gray.500"
                  _hover={{ color: 'primary.500', bg: 'gray.100' }}
                  onClick={fetchLogs}
                  isLoading={loading}
                  aria-label="Refresh logs"
                />
              </Tooltip>
            </Flex>

            {loading ? (
              <Flex justify="center" align="center" py={8}>
                <Spinner size="md" color="primary.500" mr={3} />
                <Text fontSize="sm" color="gray.500">Đang tải lịch sử...</Text>
              </Flex>
            ) : logs.length === 0 ? (
              <Box textAlign="center" py={8} borderRadius="lg" bg="gray.50" borderWidth="1px" borderColor="gray.200">
                <Text fontSize="sm" color="gray.500">Chưa có bản ghi lịch sử thao tác nào</Text>
              </Box>
            ) : (
              <VStack spacing={0} align="stretch" position="relative" pl={4}>
                {/* Timeline vertical bar */}
                <Box
                  position="absolute"
                  left="19px"
                  top="12px"
                  bottom="12px"
                  w="2px"
                  bg="gray.200"
                  zIndex={0}
                />

                {logs.map((log, index) => {
                  const IconComp = ACTION_ICONS[log.action] || FaHistory;
                  const colorConfig = ACTION_COLORS[log.action] || {
                    bg: 'rgba(58, 197, 105, 0.12)',
                    color: 'primary.600',
                    border: 'rgba(58, 197, 105, 0.3)',
                  };

                  return (
                    <Flex key={log.id || index} align="flex-start" py={3} position="relative" zIndex={1}>
                      {/* Timeline dot */}
                      <Box
                        w="24px"
                        h="24px"
                        borderRadius="full"
                        bg="white"
                        borderWidth="2px"
                        borderColor={colorConfig.color}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        color={colorConfig.color}
                        mr={3}
                        mt="2px"
                        flexShrink={0}
                      >
                        <Box as={IconComp} size={10} />
                      </Box>

                      {/* Log details box */}
                      <Box
                        flex={1}
                        p={3}
                        borderRadius="lg"
                        bg="gray.50"
                        borderWidth="1px"
                        borderColor="gray.200"
                        _hover={{ borderColor: 'gray.300', bg: 'white' }}
                        transition="all 0.2s"
                      >
                        <Flex justify="space-between" align={{ base: 'flex-start', sm: 'center' }} flexWrap="wrap" gap={2} mb={1}>
                          <HStack spacing={2} flexWrap="wrap">
                            <Badge
                              fontSize="11px"
                              px={2}
                              py={0.5}
                              borderRadius="md"
                              borderWidth="1px"
                              bg={colorConfig.bg}
                              color={colorConfig.color}
                              borderColor={colorConfig.border}
                            >
                              {log.action}
                            </Badge>
                            <Badge
                              fontSize="10px"
                              variant="outline"
                              colorScheme={log.actor_type === 'admin' ? 'purple' : log.actor_type === 'candidate' ? 'green' : 'gray'}
                            >
                              {log.actor_type === 'admin' ? 'Admin' : log.actor_type === 'candidate' ? 'Ứng viên' : 'Hệ thống'}
                            </Badge>
                          </HStack>
                          <Text fontSize="11px" color="gray.400">
                            {log.created_at}
                          </Text>
                        </Flex>

                        <Text fontSize="xs" fontWeight="medium" color="gray.900" mt={1}>
                          Người thực hiện: <Text as="span" color="primary.600" fontWeight="bold">{log.actor_name || log.actor_username || 'Hệ thống'}</Text>
                          {log.actor_username && log.actor_name && log.actor_username !== log.actor_name && (
                            <Text as="span" color="gray.500" ml={1}>
                              (@{log.actor_username})
                            </Text>
                          )}
                        </Text>

                        {log.details && (
                          <Text fontSize="xs" color="gray.600" mt={1} pl={2} borderLeft="2px solid" borderColor="gray.200">
                            {log.details}
                          </Text>
                        )}
                      </Box>
                    </Flex>
                  );
                })}
              </VStack>
            )}
          </Box>
        </ModalBody>

        <ModalFooter borderTopWidth="1px" borderColor="gray.200">
          <Button variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CandidateDetailModal;
