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
} from '@chakra-ui/react';
import {
  FaClipboardCheck,
  FaGraduationCap,
  FaUniversity,
  FaFilePdf,
  FaCheck,
  FaTimes,
  FaEye,
} from 'react-icons/fa';
import api from '../api/axios';
import ConfirmCredentialsModal from './ConfirmCredentialsModal';
import CandidateDetailModal from './CandidateDetailModal';
import { DEPARTMENT_LABELS, TRACK_LABELS, parseSubDepartments } from '../config';
import { openCandidateCV } from '../utils/cvCache';

const ApplicationScreening = ({ members, setMembers }) => {
  const toast = useToast();
  const [credentialsModal, setCredentialsModal] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [trackFilter, setTrackFilter] = useState('');
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
      const track = m.application_track || 'engineering';
      const matchTrack = trackFilter === '' || track === trackFilter;
      return matchSearch && matchDept && matchTrack;
    });
  }, [pending, searchTerm, deptFilter, trackFilter]);

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

  const openCV = (member) => {
    openCandidateCV(member?.linkCV, toast);
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
            <Heading fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color="gray.900">
              Duyệt hồ sơ vòng đơn
            </Heading>
            <Text fontSize="xs" color="gray.500">
              Sàng lọc hồ sơ ứng viên nộp qua form website BK-AUTO trước khi cấp quyền xác nhận phỏng vấn
            </Text>
          </Box>
        </HStack>
      </Box>

      {/* KPI Stat Cards */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={6}>
        <Box p={4} borderRadius="xl" bg="white" borderWidth="1px" borderColor="gray.200">
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="0.05em">
                Tổng đơn chờ duyệt
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="gray.900" mt={1}>
                {pending.length}
              </Text>
            </Box>
            <Box p={3} borderRadius="xl" bg="rgba(58, 197, 105, 0.12)" color="primary.500">
              <FaClipboardCheck size={22} />
            </Box>
          </Flex>
        </Box>

        <Box p={4} borderRadius="xl" bg="white" borderWidth="1px" borderColor="gray.200">
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="0.05em">
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

        <Box p={4} borderRadius="xl" bg="white" borderWidth="1px" borderColor="gray.200">
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="0.05em">
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
      <Box p={4} borderRadius="xl" bg="white" borderWidth="1px" borderColor="gray.200" mb={6}>
        <HStack spacing={4} flexWrap="wrap">
          <Box flex="1" minW="240px">
            <Input
              placeholder="Tìm theo tên, MSSV hoặc email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="sm"
            />
          </Box>
          <Box w={{ base: 'full', sm: '160px' }}>
            <Select
              placeholder="Tất cả track"
              value={trackFilter}
              onChange={(e) => setTrackFilter(e.target.value)}
              size="sm"
            >
              <option value="engineering" style={{ background: '#ffffff', color: '#141414' }}>
                Kỹ thuật
              </option>
              <option value="media" style={{ background: '#ffffff', color: '#141414' }}>
                Truyền thông
              </option>
            </Select>
          </Box>
          <Box w={{ base: 'full', sm: '200px' }}>
            <Select
              placeholder="Tất cả mảng"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              size="sm"
            >
              {uniqueDepartments.map((dept) => (
                <option key={dept} value={dept} style={{ background: '#ffffff', color: '#141414' }}>
                  {DEPARTMENT_LABELS[dept] || dept}
                </option>
              ))}
            </Select>
          </Box>
        </HStack>
      </Box>

      {/* Candidates Table */}
      {filteredPending.length === 0 ? (
        <Box textAlign="center" py={12} bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl">
          <Box as={FaClipboardCheck} boxSize={10} color="gray.200" mx="auto" mb={3} />
          <Text fontSize="md" fontWeight="medium" color="gray.600">
            {pending.length === 0 ? 'Không có hồ sơ nào đang chờ duyệt' : 'Không tìm thấy hồ sơ phù hợp với bộ lọc'}
          </Text>
          <Text fontSize="xs" color="gray.300" mt={1}>
            {pending.length === 0 ? 'Hồ sơ mới nộp từ form tuyển sinh sẽ xuất hiện tự động tại đây' : 'Thử xoá bớt từ khoá tìm kiếm'}
          </Text>
        </Box>
      ) : (
        <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" overflow="hidden">
          <Box overflowX="auto">
            <Table variant="simple" size="sm">
              <Thead bg="gray.50">
                <Tr>
                  <Th color="gray.500" py={3.5} fontSize="11px">Ứng viên</Th>
                  <Th color="gray.500" py={3.5} fontSize="11px">Liên hệ</Th>
                  <Th color="gray.500" py={3.5} fontSize="11px">Mảng ứng tuyển</Th>
                  <Th color="gray.500" py={3.5} fontSize="11px">Đối tượng</Th>
                  <Th color="gray.500" py={3.5} fontSize="11px">CV Đính kèm</Th>
                  <Th color="gray.500" py={3.5} fontSize="11px">Ghi chú / Trả lời</Th>
                  <Th color="gray.500" py={3.5} fontSize="11px" textAlign="right">Quyết định</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredPending.map((member) => {
                  const subDepartments = parseSubDepartments(member.sub_departments);
                  const isProcessing = processingId === member.id;

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
                          {member.major_class && (
                            <Text fontSize="xs" color="gray.400">
                              • {member.major_class}
                            </Text>
                          )}
                        </HStack>
                      </Td>

                      <Td py={3}>
                        <Text fontSize="xs" color="gray.700">{member.email}</Text>
                        <Text fontSize="xs" color="gray.400">{member.phone || '-'}</Text>
                      </Td>

                      <Td py={3}>
                        <Badge
                          bg="rgba(58, 197, 105, 0.12)"
                          color="primary.600"
                          border="1px solid"
                          borderColor="rgba(58, 197, 105, 0.3)"
                          fontSize="xs"
                        >
                          {DEPARTMENT_LABELS[member.specialist] || member.specialist}
                        </Badge>
                        {subDepartments.length > 0 && (
                          <HStack spacing={1} mt={1} flexWrap="wrap">
                            {subDepartments.map((d) => (
                              <Badge key={d} variant="subtle" bg="gray.100" color="gray.600" fontSize="10px">
                                {DEPARTMENT_LABELS[d] || d}
                              </Badge>
                            ))}
                          </HStack>
                        )}
                      </Td>

                      <Td py={3}>
                        <HStack spacing={1}>
                          <Badge
                            bg={member.application_track === 'media' ? "rgba(250, 140, 22, 0.12)" : "rgba(24, 144, 255, 0.12)"}
                            color={member.application_track === 'media' ? "orange.600" : "info.600"}
                            border="1px solid"
                            borderColor={member.application_track === 'media' ? "rgba(250, 140, 22, 0.3)" : "rgba(24, 144, 255, 0.3)"}
                            fontSize="xs"
                          >
                            {TRACK_LABELS[member.application_track] || (member.application_track === 'media' ? 'Truyền thông' : 'Kỹ thuật')}
                          </Badge>
                          {member.student_type === 'hust' ? (
                            <Badge bg="rgba(24, 144, 255, 0.12)" color="info.600" border="1px solid" borderColor="rgba(24, 144, 255, 0.3)">
                              HUST
                            </Badge>
                          ) : (
                            <Badge bg="rgba(114, 46, 209, 0.12)" color="secondary.600" border="1px solid" borderColor="rgba(114, 46, 209, 0.3)">
                              Ngoài HUST
                            </Badge>
                          )}
                        </HStack>
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
                          <Text color="gray.300" fontSize="xs">Không có</Text>
                        )}
                      </Td>

                      <Td py={3} maxW="240px">
                        <Text fontSize="xs" color="gray.600" noOfLines={2} title={member.note}>
                          {member.note || '-'}
                        </Text>
                      </Td>

                      <Td py={3} textAlign="right">
                        <HStack spacing={2} justify="flex-end">
                          <Tooltip label="Xem chi tiết & Lịch sử thao tác" placement="top">
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

export default ApplicationScreening;
