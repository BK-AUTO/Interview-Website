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
  VStack,
  Badge,
  useToast,
  SimpleGrid,
  Input,
  Select,
} from '@chakra-ui/react';
import {
  FaClipboardCheck,
  FaGraduationCap,
  FaUniversity,
  FaFilePdf,
  FaCheck,
  FaTimes,
} from 'react-icons/fa';
import api from '../api/axios';
import ConfirmCredentialsModal from './ConfirmCredentialsModal';

const ApplicationScreening = ({ members, setMembers }) => {
  const toast = useToast();
  const [credentialsModal, setCredentialsModal] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const pending = useMemo(
    () => members.filter((m) => m.state === 'Chờ duyệt'),
    [members]
  );

  const hustCount = useMemo(
    () => pending.filter((m) => m.student_type === 'hust').length,
    [pending]
  );

  const externalCount = useMemo(
    () => pending.filter((m) => m.student_type !== 'hust').length,
    [pending]
  );

  const uniqueDepartments = useMemo(() => {
    return [...new Set(pending.map((m) => m.specialist).filter(Boolean))];
  }, [pending]);

  const filteredPending = useMemo(() => {
    return pending.filter((m) => {
      const matchSearch =
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.MSSV.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.email && m.email.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchDept = deptFilter === '' || m.specialist === deptFilter;
      return matchSearch && matchDept;
    });
  }, [pending, searchTerm, deptFilter]);

  const decide = async (member, decision) => {
    setProcessingId(member.id);
    try {
      const response = await api.put(`/api/members/${member.id}`, { state: decision });
      setMembers((prev) => prev.map((m) => (m.id === member.id ? response.data.member : m)));
      
      toast({
        title: decision === 'Đậu vòng đơn' ? `Đã duyệt ĐẬU hồ sơ: ${member.name}` : `Đã duyệt TRƯỢT: ${member.name}`,
        status: decision === 'Đậu vòng đơn' ? 'success' : 'warning',
        duration: 3000,
        isClosable: true,
      });

      // First-time approval mints a confirm link + one-time password
      if (response.data.confirm_password) {
        setCredentialsModal({
          candidateName: member.name,
          url: response.data.member.confirm_url,
          password: response.data.confirm_password,
        });
      }
    } catch (error) {
      console.error('Error updating screening decision:', error);
      toast({
        title: 'Lỗi cập nhật',
        description: error.response?.data?.message || error.message,
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const openCV = async (member) => {
    if (!member.linkCV) return;
    if (!member.linkCV.startsWith('/api/uploads/')) {
      window.open(member.linkCV, '_blank', 'noopener,noreferrer');
      return;
    }
    try {
      const response = await api.get(member.linkCV, { responseType: 'blob' });
      const url = window.URL.createObjectURL(response.data);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error fetching CV:', error);
      toast({ title: 'Không tải được file CV', status: 'error', duration: 3000, isClosable: true });
    }
  };

  const parseSubDepartments = (raw) => {
    try {
      const parsed = JSON.parse(raw || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  return (
    <Box pb={8}>
      {/* Page Title */}
      <Box mb={6}>
        <HStack spacing={3} mb={1}>
          <Box p={2} borderRadius="lg" bg="rgba(58, 197, 105, 0.12)" color="primary.500">
            <FaClipboardCheck size={20} />
          </Box>
          <Box>
            <Heading fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color="white">
              Duyệt hồ sơ vòng đơn
            </Heading>
            <Text fontSize="xs" color="whiteAlpha.600">
              Sàng lọc hồ sơ ứng viên nộp qua form website BK-AUTO trước khi cấp quyền xác nhận phỏng vấn
            </Text>
          </Box>
        </HStack>
      </Box>

      {/* KPI Stat Cards */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={6}>
        <Box p={4} borderRadius="xl" bg="dark.800" borderWidth="1px" borderColor="dark.border">
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color="whiteAlpha.600" textTransform="uppercase" letterSpacing="0.05em">
                Tổng đơn chờ duyệt
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="white" mt={1}>
                {pending.length}
              </Text>
            </Box>
            <Box p={3} borderRadius="xl" bg="rgba(58, 197, 105, 0.12)" color="primary.500">
              <FaClipboardCheck size={22} />
            </Box>
          </Flex>
        </Box>

        <Box p={4} borderRadius="xl" bg="dark.800" borderWidth="1px" borderColor="dark.border">
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color="whiteAlpha.600" textTransform="uppercase" letterSpacing="0.05em">
                Sinh viên Bách Khoa (HUST)
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="info.500" mt={1}>
                {hustCount}
              </Text>
            </Box>
            <Box p={3} borderRadius="xl" bg="rgba(24, 144, 255, 0.12)" color="info.500">
              <FaGraduationCap size={22} />
            </Box>
          </Flex>
        </Box>

        <Box p={4} borderRadius="xl" bg="dark.800" borderWidth="1px" borderColor="dark.border">
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color="whiteAlpha.600" textTransform="uppercase" letterSpacing="0.05em">
                Sinh viên ngoài HUST
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="secondary.500" mt={1}>
                {externalCount}
              </Text>
            </Box>
            <Box p={3} borderRadius="xl" bg="rgba(114, 46, 209, 0.12)" color="secondary.500">
              <FaUniversity size={22} />
            </Box>
          </Flex>
        </Box>
      </SimpleGrid>

      {/* Filter & Search Bar */}
      <Box p={4} borderRadius="xl" bg="dark.800" borderWidth="1px" borderColor="dark.border" mb={6}>
        <HStack spacing={4} flexWrap="wrap">
          <Box flex="1" minW="240px">
            <Input
              placeholder="Tìm theo tên, MSSV hoặc email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="sm"
            />
          </Box>
          <Box w={{ base: 'full', sm: '200px' }}>
            <Select
              placeholder="Tất cả mảng"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              size="sm"
            >
              {uniqueDepartments.map((dept) => (
                <option key={dept} value={dept} style={{ background: '#181818', color: 'white' }}>
                  {dept}
                </option>
              ))}
            </Select>
          </Box>
        </HStack>
      </Box>

      {/* Candidates Table */}
      {filteredPending.length === 0 ? (
        <Box textAlign="center" py={12} bg="dark.800" borderWidth="1px" borderColor="dark.border" borderRadius="xl">
          <Box as={FaClipboardCheck} boxSize={10} color="whiteAlpha.300" mx="auto" mb={3} />
          <Text fontSize="md" fontWeight="medium" color="whiteAlpha.700">
            {pending.length === 0 ? 'Không có hồ sơ nào đang chờ duyệt' : 'Không tìm thấy hồ sơ phù hợp với bộ lọc'}
          </Text>
          <Text fontSize="xs" color="whiteAlpha.400" mt={1}>
            {pending.length === 0 ? 'Hồ sơ mới nộp từ form tuyển sinh sẽ xuất hiện tự động tại đây' : 'Thử xoá bớt từ khoá tìm kiếm'}
          </Text>
        </Box>
      ) : (
        <Box bg="dark.800" borderWidth="1px" borderColor="dark.border" borderRadius="xl" overflow="hidden">
          <Box overflowX="auto">
            <Table variant="simple" size="sm">
              <Thead bg="dark.850">
                <Tr>
                  <Th color="whiteAlpha.600" py={3.5} fontSize="11px">Ứng viên</Th>
                  <Th color="whiteAlpha.600" py={3.5} fontSize="11px">Liên hệ</Th>
                  <Th color="whiteAlpha.600" py={3.5} fontSize="11px">Mảng ứng tuyển</Th>
                  <Th color="whiteAlpha.600" py={3.5} fontSize="11px">Đối tượng</Th>
                  <Th color="whiteAlpha.600" py={3.5} fontSize="11px">CV Đính kèm</Th>
                  <Th color="whiteAlpha.600" py={3.5} fontSize="11px">Ghi chú / Trả lời</Th>
                  <Th color="whiteAlpha.600" py={3.5} fontSize="11px" textAlign="right">Quyết định</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredPending.map((member) => {
                  const subDepartments = parseSubDepartments(member.sub_departments);
                  const isProcessing = processingId === member.id;

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
                          {member.major_class && (
                            <Text fontSize="xs" color="whiteAlpha.500">
                              • {member.major_class}
                            </Text>
                          )}
                        </HStack>
                      </Td>

                      <Td py={3}>
                        <Text fontSize="xs" color="whiteAlpha.900">{member.email}</Text>
                        <Text fontSize="xs" color="whiteAlpha.500">{member.phone || '-'}</Text>
                      </Td>

                      <Td py={3}>
                        <Badge
                          bg="rgba(58, 197, 105, 0.12)"
                          color="primary.500"
                          border="1px solid"
                          borderColor="rgba(58, 197, 105, 0.3)"
                          fontSize="xs"
                        >
                          {member.specialist}
                        </Badge>
                        {subDepartments.length > 0 && (
                          <HStack spacing={1} mt={1} flexWrap="wrap">
                            {subDepartments.map((d) => (
                              <Badge key={d} variant="subtle" bg="dark.700" color="whiteAlpha.700" fontSize="10px">
                                {d}
                              </Badge>
                            ))}
                          </HStack>
                        )}
                      </Td>

                      <Td py={3}>
                        {member.student_type === 'hust' ? (
                          <Badge bg="rgba(24, 144, 255, 0.12)" color="info.500" border="1px solid" borderColor="rgba(24, 144, 255, 0.3)">
                            HUST
                          </Badge>
                        ) : (
                          <Badge bg="rgba(114, 46, 209, 0.12)" color="secondary.500" border="1px solid" borderColor="rgba(114, 46, 209, 0.3)">
                            Ngoài HUST
                          </Badge>
                        )}
                      </Td>

                      <Td py={3}>
                        {member.linkCV ? (
                          <Button
                            size="xs"
                            variant="outline"
                            colorScheme="info"
                            leftIcon={<FaFilePdf />}
                            onClick={() => openCV(member)}
                            borderRadius="md"
                          >
                            Xem CV
                          </Button>
                        ) : (
                          <Text color="whiteAlpha.400" fontSize="xs">Không có</Text>
                        )}
                      </Td>

                      <Td py={3} maxW="240px">
                        <Text fontSize="xs" color="whiteAlpha.700" noOfLines={2} title={member.note}>
                          {member.note || '-'}
                        </Text>
                      </Td>

                      <Td py={3} textAlign="right">
                        <HStack spacing={2} justify="flex-end">
                          <Button
                            size="xs"
                            colorScheme="primary"
                            leftIcon={<FaCheck />}
                            onClick={() => decide(member, 'Đậu vòng đơn')}
                            isLoading={isProcessing}
                          >
                            Đậu
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            colorScheme="danger"
                            leftIcon={<FaTimes />}
                            onClick={() => decide(member, 'Trượt vòng đơn')}
                            isLoading={isProcessing}
                          >
                            Trượt
                          </Button>
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
    </Box>
  );
};

export default ApplicationScreening;
