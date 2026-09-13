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
  FaIdCard,
  FaPhoneAlt,
  FaEnvelope,
  FaGraduationCap,
  FaLayerGroup,
  FaFilePdf,
  FaHistory,
  FaSyncAlt,
  FaExternalLinkAlt,
} from 'react-icons/fa';
import api from '../api/axios';
import { DEPARTMENT_LABELS, TRACK_LABELS, ACTION_ICONS, ACTION_COLORS } from '../config';
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

const CandidateDetailModal = ({ isOpen, onClose, candidate, members }) => {
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
                {candidate.name ? candidate.name.trim().slice(-1) : 'U'}
              </Box>
              <Box>
                <HStack spacing={2}>
                  <Text fontSize="lg" fontWeight="bold" color="gray.900">
                    {candidate.name}
                  </Text>
                  <Badge
                    fontSize="11px"
                    px={2}
                    py={0.5}
                    borderRadius="md"
                    borderWidth="1px"
                    bg={candidate.application_track === 'media' ? 'rgba(250, 140, 22, 0.12)' : 'rgba(24, 144, 255, 0.12)'}
                    color={candidate.application_track === 'media' ? 'orange.600' : 'info.600'}
                    borderColor={candidate.application_track === 'media' ? 'rgba(250, 140, 22, 0.3)' : 'rgba(24, 144, 255, 0.3)'}
                  >
                    {TRACK_LABELS[candidate.application_track] || (candidate.application_track === 'media' ? 'Truyền thông' : 'Kỹ thuật')}
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
                    {candidate.state}
                  </Badge>
                </HStack>
                <Text fontSize="xs" color="gray.500">
                  {candidate.student_type === 'external' ? `Trường: ${candidate.school || candidate.MSSV}` : `MSSV: ${candidate.MSSV}`}
                  {' • '}Mảng: {DEPARTMENT_LABELS[candidate.specialist] || candidate.specialist || 'Chung'}
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
                  <Text>{candidate.student_type === 'external' ? 'Trường đang theo học' : 'MSSV / Mã định danh'}</Text>
                </HStack>
                <Text fontSize="sm" fontWeight="semibold" color="gray.900">
                  {candidate.student_type === 'external' ? (candidate.school || candidate.MSSV) : candidate.MSSV}
                </Text>
              </Box>

              <Box p={3} borderRadius="lg" bg="gray.50" borderWidth="1px" borderColor="gray.200">
                <HStack spacing={2} color="gray.500" fontSize="xs" mb={1}>
                  <FaPhoneAlt />
                  <Text>Số điện thoại</Text>
                </HStack>
                <Text fontSize="sm" fontWeight="semibold" color="gray.900">
                  {candidate.phone || 'Chưa cập nhật'}
                </Text>
              </Box>

              <Box p={3} borderRadius="lg" bg="gray.50" borderWidth="1px" borderColor="gray.200">
                <HStack spacing={2} color="gray.500" fontSize="xs" mb={1}>
                  <FaEnvelope />
                  <Text>Email</Text>
                </HStack>
                <Text fontSize="sm" fontWeight="semibold" color="gray.900" isTruncated>
                  {candidate.email || 'Chưa cập nhật'}
                </Text>
              </Box>

              <Box p={3} borderRadius="lg" bg="gray.50" borderWidth="1px" borderColor="gray.200">
                <HStack spacing={2} color="gray.500" fontSize="xs" mb={1}>
                  <FaGraduationCap />
                  <Text>Lớp / Chuyên ngành</Text>
                </HStack>
                <Text fontSize="sm" fontWeight="semibold" color="gray.900">
                  {candidate.major_class || 'Chưa cập nhật'}
                  {candidate.student_type === 'hust' ? ' (HUST)' : candidate.student_type === 'external' ? ' (Ngoài HUST)' : ''}
                </Text>
              </Box>

              <Box p={3} borderRadius="lg" bg="gray.50" borderWidth="1px" borderColor="gray.200">
                <HStack spacing={2} color="gray.500" fontSize="xs" mb={1}>
                  <FaLayerGroup />
                  <Text>Mảng chuyên môn chính</Text>
                </HStack>
                <Badge colorScheme="primary" variant="subtle" fontSize="xs" borderRadius="md" px={2}>
                  {DEPARTMENT_LABELS[candidate.specialist] || candidate.specialist || 'Chung'}
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
                  {candidate.reschedule_request}
                </Text>
              </Box>
            )}

            {candidate.note && (
              <Box mt={3} p={3} borderRadius="lg" bg="gray.50" borderWidth="1px" borderColor="gray.200">
                <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>
                  Câu hỏi / Ghi chú từ ứng viên:
                </Text>
                <Text fontSize="xs" color="gray.700" whiteSpace="pre-wrap">
                  {candidate.note}
                </Text>
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

                {/* Quick advance / state selection for Main Department */}
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
                <HStack justify="space-between" align="center" mb={2}>
                  <HStack spacing={2}>
                    <Badge colorScheme="purple" fontSize="xs" px={2} py={0.5} borderRadius="md">
                      Mảng phụ
                    </Badge>
                    <Text fontSize="sm" fontWeight="bold" color="gray.900">
                      {subDepts.length > 0 ? `${subDepts.length} mảng đã đăng ký` : 'Không có'}
                    </Text>
                  </HStack>
                </HStack>

                {subDepts.length === 0 ? (
                  <Text fontSize="xs" color="gray.400" fontStyle="italic" py={2}>
                    Ứng viên không đăng ký mảng chuyên môn phụ nào.
                  </Text>
                ) : (
                  <VStack spacing={2.5} align="stretch" mt={1}>
                    {subDepts.map((sub) => {
                      const subStates = parseSubDepartmentStates(liveCandidate.sub_department_states);
                      const currentSubState = subStates[sub] || 'Chờ duyệt';
                      const subStyle = SUB_DEPARTMENT_STATE_PROPS[currentSubState] || {
                        bg: 'gray.100',
                        color: 'gray.700',
                        borderColor: 'gray.200',
                      };

                      return (
                        <Flex
                          key={sub}
                          justify="space-between"
                          align="center"
                          p={2}
                          borderRadius="md"
                          bg="white"
                          borderWidth="1px"
                          borderColor="gray.200"
                        >
                          <Text fontSize="xs" fontWeight="semibold" color="gray.800">
                            {DEPARTMENT_LABELS[sub] || sub}
                          </Text>

                          <Menu size="xs" isLazy>
                            <MenuButton
                              as={Button}
                              size="xs"
                              h="22px"
                              px={2}
                              fontSize="11px"
                              bg={subStyle.bg}
                              color={subStyle.color}
                              borderWidth="1px"
                              borderColor={subStyle.borderColor}
                            >
                              {currentSubState} ▾
                            </MenuButton>
                            <MenuList fontSize="xs" minW="130px" zIndex={10}>
                              {SUB_DEPARTMENT_STATES.map((st) => (
                                <MenuItem
                                  key={st}
                                  onClick={async () => {
                                    const updated = { ...subStates, [sub]: st };
                                    try {
                                      const res = await api.put(`/api/members/${liveCandidate.id}`, {
                                        sub_department_states: updated,
                                      });
                                      if (setMembers) {
                                        setMembers((prev) => prev.map((m) => (m.id === liveCandidate.id ? res.data.member : m)));
                                      }
                                      toast({
                                        title: `Mảng phụ [${DEPARTMENT_LABELS[sub] || sub}]: ${st}`,
                                        status: 'success',
                                        duration: 2500,
                                        isClosable: true,
                                      });
                                    } catch (err) {
                                      toast({ title: 'Lỗi cập nhật', description: err.message, status: 'error', duration: 3000, isClosable: true });
                                    }
                                  }}
                                  fontWeight={currentSubState === st ? 'bold' : 'normal'}
                                  bg={currentSubState === st ? 'primary.50' : 'transparent'}
                                  color={currentSubState === st ? 'primary.600' : 'gray.800'}
                                >
                                  {st}
                                </MenuItem>
                              ))}
                            </MenuList>
                          </Menu>
                        </Flex>
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
