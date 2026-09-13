import React, { useMemo, useState } from 'react';
import {
  Box,
  Flex,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Button,
  IconButton,
  HStack,
  VStack,
  Badge,
  useToast,
  SimpleGrid,
  Input,
  Select,
  Tooltip,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuOptionGroup,
  MenuDivider,
} from '@chakra-ui/react';
import {
  FaUserCheck,
  FaCalendarCheck,
  FaCalendarAlt,
  FaUserTimes,
  FaKey,
  FaLink,
  FaEye,
  FaChevronDown,
  FaLock,
} from 'react-icons/fa';
import api from '../api/axios';
import ConfirmCredentialsModal from './ConfirmCredentialsModal';
import CandidateDetailModal from './CandidateDetailModal';
import {
  DEPARTMENT_LABELS,
  SUB_DEPARTMENT_STATES,
  SUB_DEPARTMENT_STATE_PROPS,
  SUB_SCREENING_STATES,
  SUB_INTERVIEW_STATES,
  isSubDeptLocked,
  isSubDeptInterviewLocked,
  parseSubDepartments,
  parseSubDepartmentStates,
} from '../config';

const STATE_BADGE_PROPS = {
  'Đậu vòng đơn': {
    bg: 'rgba(24, 144, 255, 0.12)',
    color: 'info.600',
    borderColor: 'rgba(24, 144, 255, 0.3)',
    label: 'Chờ ứng viên xác nhận',
  },
  'Xin đổi lịch': {
    bg: 'rgba(250, 173, 20, 0.12)',
    color: 'warning.700',
    borderColor: 'rgba(250, 173, 20, 0.3)',
    label: 'Yêu cầu đổi lịch',
  },
  'Đã xác nhận': {
    bg: 'rgba(58, 197, 105, 0.12)',
    color: 'primary.600',
    borderColor: 'rgba(58, 197, 105, 0.3)',
    label: 'Đã xác nhận tham gia',
  },
  'Trượt vòng đơn': {
    bg: 'rgba(245, 34, 45, 0.12)',
    color: 'danger.600',
    borderColor: 'rgba(245, 34, 45, 0.3)',
    label: 'Không đạt vòng đơn',
  },
};

const RELEVANT_STATES = ['Đậu vòng đơn', 'Xin đổi lịch', 'Đã xác nhận', 'Trượt vòng đơn'];

const ApprovedCandidates = ({ members, setMembers }) => {
  const toast = useToast();
  const [credentialsModal, setCredentialsModal] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [resettingId, setResettingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [subDeptFilter, setSubDeptFilter] = useState('');

  const candidates = useMemo(
    () => members.filter((m) => RELEVANT_STATES.includes(m.state)),
    [members]
  );

  const uniqueSubDepartments = useMemo(() => {
    const allSubs = new Set();
    candidates.forEach((m) => {
      const subs = parseSubDepartments(m.sub_departments);
      subs.forEach((s) => allSubs.add(s));
    });
    return [...allSubs];
  }, [candidates]);

  const stats = useMemo(() => {
    return {
      dauVongDon: candidates.filter((m) => m.state === 'Đậu vòng đơn').length,
      daXacNhan: candidates.filter((m) => m.state === 'Đã xác nhận').length,
      xinDoiLich: candidates.filter((m) => m.state === 'Xin đổi lịch').length,
      truotVongDon: candidates.filter((m) => m.state === 'Trượt vòng đơn').length,
    };
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter((m) => {
      const matchSearch =
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.MSSV.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.specialist && m.specialist.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchState = stateFilter === '' || m.state === stateFilter;

      const memberSubs = parseSubDepartments(m.sub_departments);
      const matchSub =
        subDeptFilter === '' || memberSubs.includes(subDeptFilter);

      return matchSearch && matchState && matchSub;
    });
  }, [candidates, searchTerm, stateFilter, subDeptFilter]);

  const resetConfirmation = async (member) => {
    setResettingId(member.id);
    try {
      const response = await api.post(`/api/members/${member.id}/reset-confirmation`);
      setMembers((prev) => prev.map((m) => (m.id === member.id ? response.data.member : m)));
      setCredentialsModal({
        candidateName: member.name,
        url: response.data.member.confirm_url,
        password: response.data.confirm_password,
      });
      toast({
        title: 'Đã tạo lại mã xác nhận',
        description: `Mật khẩu mới đã được sinh cho ${member.name}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error resetting confirmation:', error);
      toast({
        title: 'Lỗi tạo lại mật khẩu',
        description: error.response?.data?.message || error.message,
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setResettingId(null);
    }
  };

  const showLink = (member) => {
    if (!member.confirm_url) {
      toast({ title: 'Ứng viên chưa có link xác nhận', status: 'warning', duration: 3000, isClosable: true });
      return;
    }
    setCredentialsModal({ candidateName: member.name, url: member.confirm_url, password: null });
  };

  const handleUpdateSubDeptState = async (member, subKey, newSubState) => {
    const currentSubStates = parseSubDepartmentStates(member.sub_department_states);
    const updatedSubStates = { ...currentSubStates, [subKey]: newSubState };

    try {
      const response = await api.put(`/api/members/${member.id}`, {
        sub_department_states: updatedSubStates,
      });
      setMembers((prev) => prev.map((m) => (m.id === member.id ? response.data.member : m)));
      toast({
        title: `Mảng phụ [${DEPARTMENT_LABELS[subKey] || subKey}]: ${newSubState}`,
        description: `Đã cập nhật trạng thái phỏng vấn mảng phụ của ${member.name}`,
        status: 'success',
        duration: 2500,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error updating sub department state:', error);
      toast({
        title: 'Lỗi cập nhật mảng phụ',
        description: error.response?.data?.error || error.response?.data?.message || error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Box pb={8}>
      {/* Page Title */}
      <Box mb={6}>
        <HStack spacing={3} mb={1}>
          <Box p={2} borderRadius="lg" bg="rgba(58, 197, 105, 0.12)" color="primary.500">
            <FaUserCheck size={20} />
          </Box>
          <Box>
            <Heading fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color="gray.900">
              Ứng viên đã duyệt & Quản lý xác nhận
            </Heading>
            <Text fontSize="xs" color="gray.500">
              Quản lý danh sách ứng viên đậu/trượt vòng đơn, 2 flow phỏng vấn mảng chính / mảng phụ và cấp link xác nhận
            </Text>
          </Box>
        </HStack>
      </Box>

      {/* KPI Stats */}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
        <Box p={4} borderRadius="xl" bg="white" borderWidth="1px" borderColor="gray.200">
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="0.05em">
                Đậu vòng đơn
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="info.500" mt={1}>
                {stats.dauVongDon}
              </Text>
            </Box>
            <Box p={2.5} borderRadius="lg" bg="rgba(24, 144, 255, 0.12)" color="info.500">
              <FaUserCheck size={18} />
            </Box>
          </Flex>
        </Box>

        <Box p={4} borderRadius="xl" bg="white" borderWidth="1px" borderColor="gray.200">
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="0.05em">
                Đã xác nhận PV
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="primary.500" mt={1}>
                {stats.daXacNhan}
              </Text>
            </Box>
            <Box p={2.5} borderRadius="lg" bg="rgba(58, 197, 105, 0.12)" color="primary.500">
              <FaCalendarCheck size={18} />
            </Box>
          </Flex>
        </Box>

        <Box p={4} borderRadius="xl" bg="white" borderWidth="1px" borderColor="gray.200">
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="0.05em">
                Xin đổi lịch
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="warning.600" mt={1}>
                {stats.xinDoiLich}
              </Text>
            </Box>
            <Box p={2.5} borderRadius="lg" bg="rgba(250, 173, 20, 0.12)" color="warning.600">
              <FaCalendarAlt size={18} />
            </Box>
          </Flex>
        </Box>

        <Box p={4} borderRadius="xl" bg="white" borderWidth="1px" borderColor="gray.200">
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="0.05em">
                Trượt vòng đơn
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="danger.500" mt={1}>
                {stats.truotVongDon}
              </Text>
            </Box>
            <Box p={2.5} borderRadius="lg" bg="rgba(245, 34, 45, 0.12)" color="danger.500">
              <FaUserTimes size={18} />
            </Box>
          </Flex>
        </Box>
      </SimpleGrid>

      {/* Filter & Search Bar */}
      <Box p={4} borderRadius="xl" bg="white" borderWidth="1px" borderColor="gray.200" mb={6}>
        <HStack spacing={4} flexWrap="wrap">
          <Box flex="1" minW="240px">
            <Input
              placeholder="Tìm theo tên, MSSV, mảng chuyên môn..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="sm"
            />
          </Box>
          <Box w={{ base: 'full', sm: '180px' }}>
            <Select
              placeholder="Tất cả mảng phụ"
              value={subDeptFilter}
              onChange={(e) => setSubDeptFilter(e.target.value)}
              size="sm"
            >
              {uniqueSubDepartments.map((s) => (
                <option key={s} value={s} style={{ background: '#ffffff', color: '#141414' }}>
                  {DEPARTMENT_LABELS[s] || s}
                </option>
              ))}
            </Select>
          </Box>
          <Box w={{ base: 'full', sm: '180px' }}>
            <Select
              placeholder="Tất cả trạng thái"
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              size="sm"
            >
              {RELEVANT_STATES.map((st) => (
                <option key={st} value={st} style={{ background: '#ffffff', color: '#141414' }}>
                  {st}
                </option>
              ))}
            </Select>
          </Box>
        </HStack>
      </Box>

      {/* Table */}
      {filteredCandidates.length === 0 ? (
        <Box textAlign="center" py={12} bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl">
          <Box as={FaUserCheck} boxSize={10} color="gray.200" mx="auto" mb={3} />
          <Text fontSize="md" fontWeight="medium" color="gray.600">
            Chưa có ứng viên nào ở danh sách này
          </Text>
        </Box>
      ) : (
        <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" overflow="hidden">
          <Box overflowX="auto">
            <Table variant="simple" size="sm">
              <Thead bg="gray.50">
                <Tr>
                  <Th color="gray.500" py={3.5} fontSize="11px">Ứng viên</Th>
                  <Th color="gray.500" py={3.5} fontSize="11px">Chuyên môn (Chính / Phụ)</Th>
                  <Th color="gray.500" py={3.5} fontSize="11px">Flow Mảng chính</Th>
                  <Th color="gray.500" py={3.5} fontSize="11px">Flow Mảng phụ</Th>
                  <Th color="gray.500" py={3.5} fontSize="11px">Yêu cầu đổi lịch</Th>
                  <Th color="gray.500" py={3.5} fontSize="11px" textAlign="right">Thao tác xác nhận</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredCandidates.map((member) => {
                  const badgeStyle = STATE_BADGE_PROPS[member.state] || {
                    bg: 'gray.100',
                    color: 'gray.900',
                    borderColor: 'gray.200',
                  };

                  const subDepts = parseSubDepartments(member.sub_departments);
                  const subStates = parseSubDepartmentStates(member.sub_department_states);

                  return (
                    <Tr
                      key={member.id}
                      _hover={{ bg: 'primary.50' }}
                      transition="background-color 0.15s"
                      borderColor="gray.200"
                    >
                      <Td py={3}>
                        <Text fontWeight="semibold" color="gray.900" fontSize="sm">
                          {member.name}
                        </Text>
                        <HStack spacing={2} mt={0.5}>
                          <Text fontSize="xs" color="primary.600" fontFamily="mono">
                            {member.MSSV}
                          </Text>
                          {member.phone && (
                            <Text fontSize="xs" color="gray.400">
                              • {member.phone}
                            </Text>
                          )}
                        </HStack>
                      </Td>

                      {/* Specialist (Main & Sub) */}
                      <Td py={3} maxW="220px">
                        <VStack align="flex-start" spacing={1}>
                          <Badge bg="rgba(58, 197, 105, 0.12)" color="primary.600" fontSize="xs">
                            {DEPARTMENT_LABELS[member.specialist] || member.specialist || 'Chung'}
                          </Badge>
                          {subDepts.length > 0 ? (
                            <HStack spacing={1} flexWrap="wrap">
                              <Text fontSize="10px" color="gray.400" fontWeight="bold">Phụ:</Text>
                              {subDepts.map((sub) => (
                                <Badge
                                  key={sub}
                                  variant="subtle"
                                  colorScheme="purple"
                                  fontSize="10px"
                                  px={1.5}
                                  borderRadius="md"
                                >
                                  {DEPARTMENT_LABELS[sub] || sub}
                                </Badge>
                              ))}
                            </HStack>
                          ) : (
                            <Text fontSize="10px" color="gray.400" fontStyle="italic">
                              Không có mảng phụ
                            </Text>
                          )}
                        </VStack>
                      </Td>

                      {/* Main Flow State */}
                      <Td py={3}>
                        <Badge
                          bg={badgeStyle.bg}
                          color={badgeStyle.color}
                          border="1px solid"
                          borderColor={badgeStyle.borderColor}
                          fontSize="xs"
                        >
                          {member.state}
                        </Badge>
                        {member.confirmed_at && (
                          <Text fontSize="10px" color="gray.400" mt={0.5}>
                            Lúc {member.confirmed_at}
                          </Text>
                        )}
                      </Td>

                      {/* Sub-Department Flow State & Actions */}
                      <Td py={3} maxW="270px">
                        {subDepts.length > 0 ? (
                          <VStack align="flex-start" spacing={1.5}>
                            {subDepts.map((sub) => {
                              const currentSubState = subStates[sub] || 'Chờ duyệt';
                              const isLocked = isSubDeptLocked(member.state);
                              const isInterviewLocked = isSubDeptInterviewLocked(member.state);
                              const subStyle = SUB_DEPARTMENT_STATE_PROPS[currentSubState] || {
                                bg: 'gray.100',
                                color: 'gray.700',
                                borderColor: 'gray.200',
                              };

                              return (
                                <HStack key={sub} spacing={1.5} flexWrap="wrap" justify="space-between" w="full">
                                  <Text fontSize="xs" fontWeight="medium" color="gray.700">
                                    {DEPARTMENT_LABELS[sub] || sub}:
                                  </Text>

                                  {isLocked ? (
                                    <Tooltip
                                      label={`Mảng chính (${DEPARTMENT_LABELS[member.specialist] || member.specialist}) chưa đậu vòng đơn`}
                                      hasArrow
                                      placement="top"
                                    >
                                      <Badge
                                        size="xs"
                                        h="20px"
                                        px={2}
                                        fontSize="10px"
                                        bg="gray.100"
                                        color="gray.400"
                                        borderWidth="1px"
                                        borderColor="gray.200"
                                        display="inline-flex"
                                        alignItems="center"
                                        gap={1}
                                        cursor="not-allowed"
                                      >
                                        <FaLock size={8} /> {currentSubState}
                                      </Badge>
                                    </Tooltip>
                                  ) : (
                                    <Menu size="xs" isLazy>
                                      <MenuButton
                                        as={Button}
                                        size="xs"
                                        h="20px"
                                        px={2}
                                        fontSize="10px"
                                        bg={subStyle.bg}
                                        color={subStyle.color}
                                        borderWidth="1px"
                                        borderColor={subStyle.borderColor}
                                        rightIcon={<FaChevronDown size={8} />}
                                      >
                                        {currentSubState}
                                      </MenuButton>
                                      <MenuList fontSize="xs" minW="160px" zIndex={10}>
                                        <MenuOptionGroup title="Vòng đơn" type="radio" value={currentSubState}>
                                          {SUB_SCREENING_STATES.map((st) => (
                                            <MenuItem
                                              key={st}
                                              onClick={() => handleUpdateSubDeptState(member, sub, st)}
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
                                                onClick={() => !disabled && handleUpdateSubDeptState(member, sub, st)}
                                                fontWeight={currentSubState === st ? 'bold' : 'normal'}
                                                bg={currentSubState === st ? 'primary.50' : 'transparent'}
                                                color={currentSubState === st ? 'primary.600' : (disabled ? 'gray.400' : 'gray.800')}
                                              >
                                                <HStack justify="space-between" w="full">
                                                  <Text>{st}</Text>
                                                  {disabled && <FaLock size={8} color="gray" />}
                                                </HStack>
                                              </MenuItem>
                                            );
                                          })}
                                        </MenuOptionGroup>
                                      </MenuList>
                                    </Menu>
                                  )}
                                </HStack>
                              );
                            })}
                          </VStack>
                        ) : (
                          <Text fontSize="xs" color="gray.400">-</Text>
                        )}
                      </Td>

                      <Td py={3} maxW="220px">
                        {member.reschedule_request ? (
                          <Box p={1.5} borderRadius="md" bg="rgba(250, 173, 20, 0.08)" border="1px solid" borderColor="rgba(250, 173, 20, 0.2)">
                            <Text fontSize="xs" color="warning.700" noOfLines={2}>
                              &ldquo;{member.reschedule_request}&rdquo;
                            </Text>
                          </Box>
                        ) : (
                          <Text fontSize="xs" color="gray.300">-</Text>
                        )}
                      </Td>

                      <Td py={3} textAlign="right">
                        <HStack spacing={2} justify="flex-end">
                          <Tooltip label="Xem chi tiết & Tiến trình 2 flow" placement="top">
                            <IconButton
                              size="xs"
                              variant="ghost"
                              icon={<FaEye />}
                              color="gray.500"
                              _hover={{ color: 'primary.500', bg: 'gray.100' }}
                              onClick={() => setSelectedCandidate(member)}
                              aria-label="Xem chi tiết"
                            />
                          </Tooltip>
                          {member.state !== 'Trượt vòng đơn' && (
                            <>
                              <Button
                                size="xs"
                                variant="outline"
                                colorScheme="primary"
                                leftIcon={<FaLink />}
                                onClick={() => showLink(member)}
                              >
                                Xem link
                              </Button>
                              <Button
                                size="xs"
                                colorScheme="primary"
                                leftIcon={<FaKey />}
                                onClick={() => resetConfirmation(member)}
                                isLoading={resettingId === member.id}
                              >
                                Mật khẩu mới
                              </Button>
                            </>
                          )}
                        </HStack>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
        </Box>
      )}

      {credentialsModal && (
        <ConfirmCredentialsModal
          isOpen={!!credentialsModal}
          onClose={() => setCredentialsModal(null)}
          candidateName={credentialsModal.candidateName}
          url={credentialsModal.url}
          password={credentialsModal.password}
        />
      )}

      {selectedCandidate && (
        <CandidateDetailModal
          isOpen={!!selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          candidate={selectedCandidate}
          members={members}
          setMembers={setMembers}
        />
      )}
    </Box>
  );
};

export default ApprovedCandidates;

