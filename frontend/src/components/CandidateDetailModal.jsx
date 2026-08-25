import React, { useState, useEffect, useCallback } from 'react';
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
} from '@chakra-ui/react';
import {
  FaUser,
  FaIdCard,
  FaPhoneAlt,
  FaEnvelope,
  FaGraduationCap,
  FaLayerGroup,
  FaFilePdf,
  FaHistory,
  FaSyncAlt,
  FaExternalLinkAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaCalendarAlt,
  FaEdit,
  FaBullhorn,
  FaMicrophoneAlt,
  FaKey,
} from 'react-icons/fa';
import api from '../api/axios';

const STATE_BADGE_PROPS = {
  'Chờ duyệt': { bg: 'rgba(115, 115, 115, 0.15)', color: 'whiteAlpha.700', borderColor: 'rgba(115, 115, 115, 0.3)' },
  'Đậu vòng đơn': { bg: 'rgba(24, 144, 255, 0.15)', color: 'info.500', borderColor: 'rgba(24, 144, 255, 0.3)' },
  'Trượt vòng đơn': { bg: 'rgba(245, 34, 45, 0.15)', color: 'danger.500', borderColor: 'rgba(245, 34, 45, 0.3)' },
  'Đã xác nhận': { bg: 'rgba(58, 197, 105, 0.15)', color: 'primary.500', borderColor: 'rgba(58, 197, 105, 0.3)' },
  'Xin đổi lịch': { bg: 'rgba(250, 173, 20, 0.15)', color: 'warning.500', borderColor: 'rgba(250, 173, 20, 0.3)' },
  'Chưa checkin': { bg: 'rgba(115, 115, 115, 0.15)', color: 'whiteAlpha.600', borderColor: 'rgba(115, 115, 115, 0.25)' },
  'Đã checkin': { bg: 'rgba(82, 196, 26, 0.15)', color: 'success.500', borderColor: 'rgba(82, 196, 26, 0.3)' },
  'Gọi PV': { bg: 'rgba(250, 173, 20, 0.15)', color: 'warning.500', borderColor: 'rgba(250, 173, 20, 0.3)' },
  'Đang phỏng vấn': { bg: 'rgba(114, 46, 209, 0.18)', color: 'secondary.500', borderColor: 'rgba(114, 46, 209, 0.4)' },
  'Đã phỏng vấn': { bg: 'rgba(58, 197, 105, 0.15)', color: 'primary.500', borderColor: 'rgba(58, 197, 105, 0.3)' },
};

const ACTION_ICONS = {
  'Nộp hồ sơ ứng tuyển': FaFilePdf,
  'Thêm ứng viên': FaUser,
  'Duyệt đậu vòng đơn': FaCheckCircle,
  'Duyệt trượt vòng đơn': FaTimesCircle,
  'Xác nhận tham gia phỏng vấn': FaCalendarAlt,
  'Yêu cầu đổi lịch phỏng vấn': FaCalendarAlt,
  'Tạo lại mật khẩu xác nhận': FaKey,
  'Check-in tại sự kiện': FaCheckCircle,
  'Gọi phỏng vấn': FaBullhorn,
  'Bắt đầu phỏng vấn': FaMicrophoneAlt,
  'Hoàn thành phỏng vấn': FaCheckCircle,
  'Cập nhật thông tin': FaEdit,
  'Chuyển trạng thái': FaEdit,
  'Xoá ứng viên': FaTimesCircle,
};

const ACTION_COLORS = {
  'Nộp hồ sơ ứng tuyển': { bg: 'rgba(24, 144, 255, 0.15)', color: 'info.500', border: 'rgba(24, 144, 255, 0.3)' },
  'Duyệt đậu vòng đơn': { bg: 'rgba(58, 197, 105, 0.15)', color: 'primary.500', border: 'rgba(58, 197, 105, 0.3)' },
  'Duyệt trượt vòng đơn': { bg: 'rgba(245, 34, 45, 0.15)', color: 'danger.500', border: 'rgba(245, 34, 45, 0.3)' },
  'Xác nhận tham gia phỏng vấn': { bg: 'rgba(82, 196, 26, 0.15)', color: 'success.500', border: 'rgba(82, 196, 26, 0.3)' },
  'Yêu cầu đổi lịch phỏng vấn': { bg: 'rgba(250, 173, 20, 0.15)', color: 'warning.500', border: 'rgba(250, 173, 20, 0.3)' },
  'Tạo lại mật khẩu xác nhận': { bg: 'rgba(250, 173, 20, 0.15)', color: 'warning.500', border: 'rgba(250, 173, 20, 0.3)' },
  'Check-in tại sự kiện': { bg: 'rgba(82, 196, 26, 0.15)', color: 'success.500', border: 'rgba(82, 196, 26, 0.3)' },
  'Gọi phỏng vấn': { bg: 'rgba(250, 173, 20, 0.15)', color: 'warning.500', border: 'rgba(250, 173, 20, 0.3)' },
  'Bắt đầu phỏng vấn': { bg: 'rgba(114, 46, 209, 0.18)', color: 'secondary.500', border: 'rgba(114, 46, 209, 0.4)' },
  'Hoàn thành phỏng vấn': { bg: 'rgba(58, 197, 105, 0.15)', color: 'primary.500', border: 'rgba(58, 197, 105, 0.3)' },
  'Cập nhật thông tin': { bg: 'rgba(115, 115, 115, 0.15)', color: 'whiteAlpha.800', border: 'rgba(115, 115, 115, 0.3)' },
};

const CandidateDetailModal = ({ isOpen, onClose, candidate }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const fetchLogs = useCallback(async () => {
    if (!candidate?.id) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/members/${candidate.id}/audit-logs`);
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
  }, [candidate?.id, toast]);

  useEffect(() => {
    if (isOpen && candidate?.id) {
      fetchLogs();
    } else {
      setLogs([]);
    }
  }, [isOpen, candidate?.id, fetchLogs]);

  if (!candidate) return null;

  const stateProps = STATE_BADGE_PROPS[candidate.state] || {
    bg: 'dark.700',
    color: 'whiteAlpha.700',
    borderColor: 'dark.border',
  };

  const parseSubDepts = () => {
    try {
      if (!candidate.sub_departments) return [];
      const parsed = typeof candidate.sub_departments === 'string'
        ? JSON.parse(candidate.sub_departments)
        : candidate.sub_departments;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const subDepts = parseSubDepts();

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.750" backdropFilter="blur(4px)" />
      <ModalContent
        bg="dark.800"
        borderWidth="1px"
        borderColor="dark.border"
        color="white"
        borderRadius="xl"
        maxW={{ base: '95%', md: '750px' }}
      >
        <ModalHeader borderBottomWidth="1px" borderColor="dark.border" pb={4}>
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
                {candidate.name ? candidate.name.trim().slice(-1) : 'U'}
              </Box>
              <Box>
                <HStack spacing={2}>
                  <Text fontSize="lg" fontWeight="bold" color="white">
                    {candidate.name}
                  </Text>
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
                    {candidate.state}
                  </Badge>
                </HStack>
                <Text fontSize="xs" color="whiteAlpha.500">
                  MSSV: {candidate.MSSV} • Mảng: {candidate.specialist || 'Chung'}
                </Text>
              </Box>
            </HStack>
          </Flex>
        </ModalHeader>
        <ModalCloseButton color="whiteAlpha.600" _hover={{ color: 'white' }} />

        <ModalBody py={5}>
          {/* Section 1: Candidate Full Info */}
          <Box mb={6}>
            <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="whiteAlpha.400" mb={3}>
              Thông tin ứng viên
            </Text>
            <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
              <Box p={3} borderRadius="lg" bg="dark.750" borderWidth="1px" borderColor="dark.border">
                <HStack spacing={2} color="whiteAlpha.500" fontSize="xs" mb={1}>
                  <FaIdCard />
                  <Text>MSSV / Mã định danh</Text>
                </HStack>
                <Text fontSize="sm" fontWeight="semibold" color="white">
                  {candidate.MSSV}
                </Text>
              </Box>

              <Box p={3} borderRadius="lg" bg="dark.750" borderWidth="1px" borderColor="dark.border">
                <HStack spacing={2} color="whiteAlpha.500" fontSize="xs" mb={1}>
                  <FaPhoneAlt />
                  <Text>Số điện thoại</Text>
                </HStack>
                <Text fontSize="sm" fontWeight="semibold" color="white">
                  {candidate.phone || 'Chưa cập nhật'}
                </Text>
              </Box>

              <Box p={3} borderRadius="lg" bg="dark.750" borderWidth="1px" borderColor="dark.border">
                <HStack spacing={2} color="whiteAlpha.500" fontSize="xs" mb={1}>
                  <FaEnvelope />
                  <Text>Email</Text>
                </HStack>
                <Text fontSize="sm" fontWeight="semibold" color="white" isTruncated>
                  {candidate.email || 'Chưa cập nhật'}
                </Text>
              </Box>

              <Box p={3} borderRadius="lg" bg="dark.750" borderWidth="1px" borderColor="dark.border">
                <HStack spacing={2} color="whiteAlpha.500" fontSize="xs" mb={1}>
                  <FaGraduationCap />
                  <Text>Lớp / Chuyên ngành</Text>
                </HStack>
                <Text fontSize="sm" fontWeight="semibold" color="white">
                  {candidate.major_class || 'Chưa cập nhật'}
                  {candidate.student_type === 'hust' ? ' (HUST)' : candidate.student_type === 'external' ? ' (Ngoài HUST)' : ''}
                </Text>
              </Box>

              <Box p={3} borderRadius="lg" bg="dark.750" borderWidth="1px" borderColor="dark.border">
                <HStack spacing={2} color="whiteAlpha.500" fontSize="xs" mb={1}>
                  <FaLayerGroup />
                  <Text>Mảng chuyên môn chính</Text>
                </HStack>
                <Badge colorScheme="primary" variant="subtle" fontSize="xs" borderRadius="md" px={2}>
                  {candidate.specialist || 'Chung'}
                </Badge>
                {subDepts.length > 0 && (
                  <HStack spacing={1} mt={1.5} flexWrap="wrap">
                    {subDepts.map((d, i) => (
                      <Badge key={i} size="sm" variant="outline" fontSize="10px" colorScheme="gray">
                        {d}
                      </Badge>
                    ))}
                  </HStack>
                )}
              </Box>

              <Box p={3} borderRadius="lg" bg="dark.750" borderWidth="1px" borderColor="dark.border">
                <HStack spacing={2} color="whiteAlpha.500" fontSize="xs" mb={1}>
                  <FaFilePdf />
                  <Text>Hồ sơ CV</Text>
                </HStack>
                {candidate.linkCV ? (
                  <Link
                    href={candidate.linkCV.startsWith('http') ? candidate.linkCV : candidate.linkCV}
                    target="_blank"
                    rel="noopener noreferrer"
                    color="primary.400"
                    fontSize="sm"
                    fontWeight="medium"
                    display="inline-flex"
                    alignItems="center"
                    gap={1.5}
                    _hover={{ textDecoration: 'underline', color: 'primary.300' }}
                  >
                    Xem file CV <FaExternalLinkAlt size={10} />
                  </Link>
                ) : (
                  <Text fontSize="sm" color="whiteAlpha.400">Không có CV</Text>
                )}
              </Box>
            </SimpleGrid>

            {candidate.reschedule_request && (
              <Box mt={3} p={3} borderRadius="lg" bg="rgba(250, 173, 20, 0.08)" borderWidth="1px" borderColor="rgba(250, 173, 20, 0.25)">
                <Text fontSize="xs" fontWeight="bold" color="warning.500" mb={1}>
                  ⚠️ Lý do xin đổi lịch:
                </Text>
                <Text fontSize="xs" color="whiteAlpha.900">
                  {candidate.reschedule_request}
                </Text>
              </Box>
            )}

            {candidate.note && (
              <Box mt={3} p={3} borderRadius="lg" bg="dark.750" borderWidth="1px" borderColor="dark.border">
                <Text fontSize="xs" fontWeight="bold" color="whiteAlpha.500" mb={1}>
                  Câu hỏi / Ghi chú từ ứng viên:
                </Text>
                <Text fontSize="xs" color="whiteAlpha.800" whiteSpace="pre-wrap">
                  {candidate.note}
                </Text>
              </Box>
            )}
          </Box>

          <Divider borderColor="dark.border" mb={5} />

          {/* Section 2: Audit Logs Timeline */}
          <Box>
            <Flex justify="space-between" align="center" mb={3}>
              <HStack spacing={2}>
                <Box as={FaHistory} color="primary.500" />
                <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="whiteAlpha.400">
                  Lịch sử thao tác & Tiến trình ({logs.length})
                </Text>
              </HStack>
              <Tooltip label="Làm mới lịch sử" placement="top">
                <IconButton
                  icon={<FaSyncAlt />}
                  size="xs"
                  variant="ghost"
                  color="whiteAlpha.600"
                  _hover={{ color: 'primary.500', bg: 'dark.700' }}
                  onClick={fetchLogs}
                  isLoading={loading}
                  aria-label="Refresh logs"
                />
              </Tooltip>
            </Flex>

            {loading ? (
              <Flex justify="center" align="center" py={8}>
                <Spinner size="md" color="primary.500" mr={3} />
                <Text fontSize="sm" color="whiteAlpha.600">Đang tải lịch sử...</Text>
              </Flex>
            ) : logs.length === 0 ? (
              <Box textAlign="center" py={8} borderRadius="lg" bg="dark.750" borderWidth="1px" borderColor="dark.border">
                <Text fontSize="sm" color="whiteAlpha.500">Chưa có bản ghi lịch sử thao tác nào</Text>
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
                  bg="dark.border"
                  zIndex={0}
                />

                {logs.map((log, index) => {
                  const IconComp = ACTION_ICONS[log.action] || FaHistory;
                  const colorConfig = ACTION_COLORS[log.action] || {
                    bg: 'rgba(58, 197, 105, 0.12)',
                    color: 'primary.500',
                    border: 'rgba(58, 197, 105, 0.3)',
                  };

                  return (
                    <Flex key={log.id || index} align="flex-start" py={3} position="relative" zIndex={1}>
                      {/* Timeline dot */}
                      <Box
                        w="24px"
                        h="24px"
                        borderRadius="full"
                        bg="dark.800"
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
                        bg="dark.750"
                        borderWidth="1px"
                        borderColor="dark.border"
                        _hover={{ borderColor: 'whiteAlpha.300', bg: 'dark.700' }}
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
                          <Text fontSize="11px" color="whiteAlpha.400">
                            {log.created_at}
                          </Text>
                        </Flex>

                        <Text fontSize="xs" fontWeight="medium" color="white" mt={1}>
                          Người thực hiện: <Text as="span" color="primary.400" fontWeight="bold">{log.actor_name || log.actor_username || 'Hệ thống'}</Text>
                          {log.actor_username && log.actor_name && log.actor_username !== log.actor_name && (
                            <Text as="span" color="whiteAlpha.500" ml={1}>
                              (@{log.actor_username})
                            </Text>
                          )}
                        </Text>

                        {log.details && (
                          <Text fontSize="xs" color="whiteAlpha.700" mt={1} pl={2} borderLeft="2px solid" borderColor="dark.border">
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

        <ModalFooter borderTopWidth="1px" borderColor="dark.border">
          <Button variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CandidateDetailModal;
