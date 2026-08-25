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
  HStack,
  Badge,
  useToast,
  SimpleGrid,
  Input,
  Select,
} from '@chakra-ui/react';
import {
  FaUserCheck,
  FaCalendarCheck,
  FaCalendarAlt,
  FaUserTimes,
  FaKey,
  FaLink,
} from 'react-icons/fa';
import api from '../api/axios';
import ConfirmCredentialsModal from './ConfirmCredentialsModal';

const STATE_BADGE_PROPS = {
  'Đậu vòng đơn': {
    bg: 'rgba(24, 144, 255, 0.12)',
    color: 'info.500',
    borderColor: 'rgba(24, 144, 255, 0.3)',
    label: 'Chờ ứng viên xác nhận',
  },
  'Xin đổi lịch': {
    bg: 'rgba(250, 173, 20, 0.12)',
    color: 'warning.500',
    borderColor: 'rgba(250, 173, 20, 0.3)',
    label: 'Yêu cầu đổi lịch',
  },
  'Đã xác nhận': {
    bg: 'rgba(58, 197, 105, 0.12)',
    color: 'primary.500',
    borderColor: 'rgba(58, 197, 105, 0.3)',
    label: 'Đã xác nhận tham gia',
  },
  'Trượt vòng đơn': {
    bg: 'rgba(245, 34, 45, 0.12)',
    color: 'danger.500',
    borderColor: 'rgba(245, 34, 45, 0.3)',
    label: 'Không đạt vòng đơn',
  },
};

const RELEVANT_STATES = ['Đậu vòng đơn', 'Xin đổi lịch', 'Đã xác nhận', 'Trượt vòng đơn'];

const ApprovedCandidates = ({ members, setMembers }) => {
  const toast = useToast();
  const [credentialsModal, setCredentialsModal] = useState(null);
  const [resettingId, setResettingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('');

  const candidates = useMemo(
    () => members.filter((m) => RELEVANT_STATES.includes(m.state)),
    [members]
  );

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
      return matchSearch && matchState;
    });
  }, [candidates, searchTerm, stateFilter]);

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

  return (
    <Box pb={8}>
      {/* Page Title */}
      <Box mb={6}>
        <HStack spacing={3} mb={1}>
          <Box p={2} borderRadius="lg" bg="rgba(58, 197, 105, 0.12)" color="primary.500">
            <FaUserCheck size={20} />
          </Box>
          <Box>
            <Heading fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color="white">
              Ứng viên đã duyệt & Quản lý xác nhận
            </Heading>
            <Text fontSize="xs" color="whiteAlpha.600">
              Quản lý danh sách ứng viên đậu/trượt vòng đơn, lấy link và mã xác nhận gửi cho ứng viên
            </Text>
          </Box>
        </HStack>
      </Box>

      {/* KPI Stats */}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
        <Box p={4} borderRadius="xl" bg="dark.800" borderWidth="1px" borderColor="dark.border">
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color="whiteAlpha.600" textTransform="uppercase" letterSpacing="0.05em">
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

        <Box p={4} borderRadius="xl" bg="dark.800" borderWidth="1px" borderColor="dark.border">
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color="whiteAlpha.600" textTransform="uppercase" letterSpacing="0.05em">
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

        <Box p={4} borderRadius="xl" bg="dark.800" borderWidth="1px" borderColor="dark.border">
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color="whiteAlpha.600" textTransform="uppercase" letterSpacing="0.05em">
                Xin đổi lịch
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="warning.500" mt={1}>
                {stats.xinDoiLich}
              </Text>
            </Box>
            <Box p={2.5} borderRadius="lg" bg="rgba(250, 173, 20, 0.12)" color="warning.500">
              <FaCalendarAlt size={18} />
            </Box>
          </Flex>
        </Box>

        <Box p={4} borderRadius="xl" bg="dark.800" borderWidth="1px" borderColor="dark.border">
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color="whiteAlpha.600" textTransform="uppercase" letterSpacing="0.05em">
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
      <Box p={4} borderRadius="xl" bg="dark.800" borderWidth="1px" borderColor="dark.border" mb={6}>
        <HStack spacing={4} flexWrap="wrap">
          <Box flex="1" minW="240px">
            <Input
              placeholder="Tìm theo tên, MSSV, mảng ứng tuyển..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="sm"
            />
          </Box>
          <Box w={{ base: 'full', sm: '200px' }}>
            <Select
              placeholder="Tất cả trạng thái"
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              size="sm"
            >
              {RELEVANT_STATES.map((st) => (
                <option key={st} value={st} style={{ background: '#181818', color: 'white' }}>
                  {st}
                </option>
              ))}
            </Select>
          </Box>
        </HStack>
      </Box>

      {/* Table */}
      {filteredCandidates.length === 0 ? (
        <Box textAlign="center" py={12} bg="dark.800" borderWidth="1px" borderColor="dark.border" borderRadius="xl">
          <Box as={FaUserCheck} boxSize={10} color="whiteAlpha.300" mx="auto" mb={3} />
          <Text fontSize="md" fontWeight="medium" color="whiteAlpha.700">
            Chưa có ứng viên nào ở danh sách này
          </Text>
        </Box>
      ) : (
        <Box bg="dark.800" borderWidth="1px" borderColor="dark.border" borderRadius="xl" overflow="hidden">
          <Box overflowX="auto">
            <Table variant="simple" size="sm">
              <Thead bg="dark.850">
                <Tr>
                  <Th color="whiteAlpha.600" py={3.5} fontSize="11px">Ứng viên</Th>
                  <Th color="whiteAlpha.600" py={3.5} fontSize="11px">Mảng ứng tuyển</Th>
                  <Th color="whiteAlpha.600" py={3.5} fontSize="11px">Trạng thái xác nhận</Th>
                  <Th color="whiteAlpha.600" py={3.5} fontSize="11px">Yêu cầu đổi lịch</Th>
                  <Th color="whiteAlpha.600" py={3.5} fontSize="11px" textAlign="right">Thao tác xác nhận</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredCandidates.map((member) => {
                  const badgeStyle = STATE_BADGE_PROPS[member.state] || {
                    bg: 'dark.700',
                    color: 'white',
                    borderColor: 'dark.border',
                  };

                  return (
                    <Tr
                      key={member.id}
                      _hover={{ bg: 'dark.750' }}
                      transition="background-color 0.15s"
                      borderColor="dark.border"
                    >
                      <Td py={3}>
                        <Text fontWeight="semibold" color="white" fontSize="sm">
                          {member.name}
                        </Text>
                        <HStack spacing={2} mt={0.5}>
                          <Text fontSize="xs" color="primary.500" fontFamily="mono">
                            {member.MSSV}
                          </Text>
                          {member.phone && (
                            <Text fontSize="xs" color="whiteAlpha.500">
                              • {member.phone}
                            </Text>
                          )}
                        </HStack>
                      </Td>

                      <Td py={3}>
                        <Badge bg="dark.700" color="whiteAlpha.800" fontSize="xs">
                          {member.specialist}
                        </Badge>
                      </Td>

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
                          <Text fontSize="10px" color="whiteAlpha.400" mt={0.5}>
                            Lúc {member.confirmed_at}
                          </Text>
                        )}
                      </Td>

                      <Td py={3} maxW="240px">
                        {member.reschedule_request ? (
                          <Box p={1.5} borderRadius="md" bg="rgba(250, 173, 20, 0.08)" border="1px solid" borderColor="rgba(250, 173, 20, 0.2)">
                            <Text fontSize="xs" color="warning.500" noOfLines={2}>
                              &ldquo;{member.reschedule_request}&rdquo;
                            </Text>
                          </Box>
                        ) : (
                          <Text fontSize="xs" color="whiteAlpha.400">-</Text>
                        )}
                      </Td>

                      <Td py={3} textAlign="right">
                        {member.state === 'Trượt vòng đơn' ? (
                          <Text fontSize="xs" color="whiteAlpha.400">-</Text>
                        ) : (
                          <HStack spacing={2} justify="flex-end">
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
                              Tạo mật khẩu mới
                            </Button>
                          </HStack>
                        )}
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
    </Box>
  );
};

export default ApprovedCandidates;
