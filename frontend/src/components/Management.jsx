import React, { useState, useMemo } from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Input,
  Select,
  Button,
  IconButton,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useToast,
  Badge,
  HStack,
  VStack,
  SimpleGrid,
  FormControl,
  FormLabel,
  Textarea,
  Tooltip,
} from '@chakra-ui/react';
import {
  TriangleDownIcon,
  TriangleUpIcon,
  EditIcon,
  DeleteIcon,
  AddIcon,
} from '@chakra-ui/icons';
import {
  FaUsers,
  FaUserCheck,
  FaHourglassHalf,
  FaCheckCircle,
  FaFilePdf,
  FaArrowRight,
} from 'react-icons/fa';
import api from '../api/axios';

const STATE_BADGE_PROPS = {
  'Chờ duyệt': { bg: 'rgba(115, 115, 115, 0.15)', color: 'whiteAlpha.700', borderColor: 'rgba(115, 115, 115, 0.3)' },
  'Đậu vòng đơn': { bg: 'rgba(24, 144, 255, 0.15)', color: 'info.500', borderColor: 'rgba(24, 144, 255, 0.3)' },
  'Xin đổi lịch': { bg: 'rgba(250, 173, 20, 0.15)', color: 'warning.500', borderColor: 'rgba(250, 173, 20, 0.3)' },
  'Đã xác nhận': { bg: 'rgba(58, 197, 105, 0.15)', color: 'primary.500', borderColor: 'rgba(58, 197, 105, 0.3)' },
  'Trượt vòng đơn': { bg: 'rgba(245, 34, 45, 0.15)', color: 'danger.500', borderColor: 'rgba(245, 34, 45, 0.3)' },
  'Đã checkin': { bg: 'rgba(58, 197, 105, 0.2)', color: 'primary.500', borderColor: 'rgba(58, 197, 105, 0.4)' },
  'Gọi PV': { bg: 'rgba(250, 173, 20, 0.2)', color: 'warning.500', borderColor: 'rgba(250, 173, 20, 0.4)' },
  'Đang phỏng vấn': { bg: 'rgba(114, 46, 209, 0.2)', color: 'secondary.500', borderColor: 'rgba(114, 46, 209, 0.4)' },
  'Đã phỏng vấn': { bg: 'rgba(82, 196, 26, 0.25)', color: 'success.500', borderColor: 'rgba(82, 196, 26, 0.4)' },
};

const Management = ({ members, setMembers }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [filterConfig, setFilterConfig] = useState({ name: '', MSSV: '', specialist: '', state: '' });
  const [selectedMember, setSelectedMember] = useState(null);
  const [isAdvancingId, setIsAdvancingId] = useState(null);

  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const cancelRef = React.useRef();
  const toast = useToast();

  const uniqueSpecialists = useMemo(() => {
    return [...new Set(members.map((m) => m.specialist).filter(Boolean))];
  }, [members]);

  const stats = useMemo(() => {
    return {
      total: members.length,
      checkedIn: members.filter((m) => m.state === 'Đã checkin').length,
      interviewing: members.filter((m) => m.state === 'Đang phỏng vấn' || m.state === 'Gọi PV').length,
      completed: members.filter((m) => m.state === 'Đã phỏng vấn').length,
    };
  }, [members]);

  const sortedMembers = useMemo(() => {
    const sortable = [...members];
    if (sortConfig.key) {
      sortable.sort((a, b) => {
        const valA = a[sortConfig.key] || '';
        const valB = b[sortConfig.key] || '';
        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortable;
  }, [members, sortConfig]);

  const filteredMembers = useMemo(() => {
    return sortedMembers.filter((member) => {
      const matchName = member.name.toLowerCase().includes(filterConfig.name.toLowerCase());
      const matchMSSV = member.MSSV.toLowerCase().includes(filterConfig.MSSV.toLowerCase());
      const matchSpecialist = filterConfig.specialist === '' || member.specialist === filterConfig.specialist;
      const matchState = filterConfig.state === '' || member.state === filterConfig.state;
      return matchName && matchMSSV && matchSpecialist && matchState;
    });
  }, [sortedMembers, filterConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'ascending' ? <TriangleUpIcon ml={1} /> : <TriangleDownIcon ml={1} />;
    }
    return null;
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilterConfig((prev) => ({ ...prev, [name]: value }));
  };

  const openEditModal = (member) => {
    setSelectedMember(
      member || {
        name: '',
        MSSV: '',
        specialist: '',
        email: '',
        phone: '',
        linkCV: '',
        state: 'Đậu vòng đơn',
        note: '',
      }
    );
    onEditOpen();
  };

  const handleModalClose = () => {
    setSelectedMember(null);
    onEditClose();
  };

  const handleModalSave = async () => {
    if (!selectedMember) return;

    try {
      if (selectedMember.id) {
        const response = await api.put(`/api/members/${selectedMember.id}`, selectedMember);
        setMembers((prev) => prev.map((m) => (m.id === selectedMember.id ? response.data.member : m)));
        toast({ title: 'Cập nhật thành công', status: 'success', duration: 2500, isClosable: true });
      } else {
        const response = await api.post('/api/members', selectedMember);
        setMembers((prev) => [...prev, response.data.member]);
        toast({ title: 'Thêm ứng viên thành công', status: 'success', duration: 2500, isClosable: true });
      }
      handleModalClose();
    } catch (error) {
      console.error('Error saving member:', error);
      toast({
        title: 'Lỗi lưu thông tin',
        description: error.response?.data?.message || error.message,
        status: 'error',
        duration: 3500,
        isClosable: true,
      });
    }
  };

  const handleDeleteClick = (member) => {
    setSelectedMember(member);
    onDeleteOpen();
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/api/members/${selectedMember.id}`);
      setMembers((prev) => prev.filter((m) => m.id !== selectedMember.id));
      toast({ title: 'Đã xoá ứng viên', status: 'warning', duration: 2500, isClosable: true });
      onDeleteClose();
    } catch (error) {
      console.error('Error deleting member:', error);
      toast({ title: 'Lỗi xoá ứng viên', status: 'error', duration: 3000, isClosable: true });
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
      toast({ title: 'Không tải được CV', status: 'error', duration: 3000, isClosable: true });
    }
  };

  // State pipeline advance: 'Đã checkin' -> 'Gọi PV' -> 'Đang phỏng vấn' -> 'Đã phỏng vấn'
  const handleAdvanceState = async (member) => {
    let nextState = '';
    if (member.state === 'Đã checkin') nextState = 'Gọi PV';
    else if (member.state === 'Gọi PV') nextState = 'Đang phỏng vấn';
    else if (member.state === 'Đang phỏng vấn') nextState = 'Đã phỏng vấn';
    else return;

    setIsAdvancingId(member.id);
    try {
      const response = await api.put(`/api/members/${member.id}`, { state: nextState });
      setMembers((prev) => prev.map((m) => (m.id === member.id ? response.data.member : m)));
      toast({
        title: `Đã chuyển sang: ${nextState}`,
        description: `${member.name} -> ${nextState}`,
        status: 'info',
        duration: 2500,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error advancing state:', error);
      toast({ title: 'Không thể cập nhật trạng thái', status: 'error', duration: 3000, isClosable: true });
    } finally {
      setIsAdvancingId(null);
    }
  };

  return (
    <Box pb={8}>
      {/* Page Title */}
      <Box mb={6}>
        <HStack spacing={3} mb={1}>
          <Box p={2} borderRadius="lg" bg="rgba(58, 197, 105, 0.12)" color="primary.500">
            <FaUsers size={20} />
          </Box>
          <Box>
            <Heading fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color="white">
              Quản lý danh sách ứng viên
            </Heading>
            <Text fontSize="xs" color="whiteAlpha.600">
              Toàn bộ cơ sở dữ liệu ứng viên tuyển thành viên CLB BK-AUTO và điều phối tiến trình phỏng vấn
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
                Tổng ứng viên
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="white" mt={1}>
                {stats.total}
              </Text>
            </Box>
            <Box p={2.5} borderRadius="lg" bg="rgba(255, 255, 255, 0.08)" color="whiteAlpha.800">
              <FaUsers size={18} />
            </Box>
          </Flex>
        </Box>

        <Box p={4} borderRadius="xl" bg="dark.800" borderWidth="1px" borderColor="dark.border">
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color="whiteAlpha.600" textTransform="uppercase" letterSpacing="0.05em">
                Đã check-in (Chờ)
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="primary.500" mt={1}>
                {stats.checkedIn}
              </Text>
            </Box>
            <Box p={2.5} borderRadius="lg" bg="rgba(58, 197, 105, 0.12)" color="primary.500">
              <FaUserCheck size={18} />
            </Box>
          </Flex>
        </Box>

        <Box p={4} borderRadius="xl" bg="dark.800" borderWidth="1px" borderColor="dark.border">
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color="whiteAlpha.600" textTransform="uppercase" letterSpacing="0.05em">
                Đang PV / Gọi PV
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="warning.500" mt={1}>
                {stats.interviewing}
              </Text>
            </Box>
            <Box p={2.5} borderRadius="lg" bg="rgba(250, 173, 20, 0.12)" color="warning.500">
              <FaHourglassHalf size={18} />
            </Box>
          </Flex>
        </Box>

        <Box p={4} borderRadius="xl" bg="dark.800" borderWidth="1px" borderColor="dark.border">
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color="whiteAlpha.600" textTransform="uppercase" letterSpacing="0.05em">
                Đã phỏng vấn xong
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="success.500" mt={1}>
                {stats.completed}
              </Text>
            </Box>
            <Box p={2.5} borderRadius="lg" bg="rgba(82, 196, 26, 0.12)" color="success.500">
              <FaCheckCircle size={18} />
            </Box>
          </Flex>
        </Box>
      </SimpleGrid>

      {/* Filter & Action Toolbar */}
      <Box p={4} borderRadius="xl" bg="dark.800" borderWidth="1px" borderColor="dark.border" mb={6}>
        <Flex gap={3} flexWrap="wrap" justify="space-between" align="center">
          <HStack spacing={3} flex="1" minW="300px" flexWrap="wrap">
            <Input
              placeholder="Tìm theo họ tên..."
              name="name"
              value={filterConfig.name}
              onChange={handleFilterChange}
              size="sm"
              w={{ base: 'full', sm: '180px' }}
            />
            <Input
              placeholder="Tìm MSSV..."
              name="MSSV"
              value={filterConfig.MSSV}
              onChange={handleFilterChange}
              size="sm"
              w={{ base: 'full', sm: '140px' }}
            />
            <Select
              placeholder="Tất cả mảng"
              name="specialist"
              value={filterConfig.specialist}
              onChange={handleFilterChange}
              size="sm"
              w={{ base: 'full', sm: '160px' }}
            >
              {uniqueSpecialists.map((s) => (
                <option key={s} value={s} style={{ background: '#181818', color: 'white' }}>
                  {s}
                </option>
              ))}
            </Select>
            <Select
              placeholder="Tất cả trạng thái"
              name="state"
              value={filterConfig.state}
              onChange={handleFilterChange}
              size="sm"
              w={{ base: 'full', sm: '180px' }}
            >
              {Object.keys(STATE_BADGE_PROPS).map((st) => (
                <option key={st} value={st} style={{ background: '#181818', color: 'white' }}>
                  {st}
                </option>
              ))}
            </Select>
          </HStack>

          <Button
            size="sm"
            colorScheme="primary"
            leftIcon={<AddIcon />}
            onClick={() => openEditModal()}
          >
            Thêm ứng viên
          </Button>
        </Flex>
      </Box>

      {/* Table */}
      {filteredMembers.length === 0 ? (
        <Box textAlign="center" py={12} bg="dark.800" borderWidth="1px" borderColor="dark.border" borderRadius="xl">
          <Box as={FaUsers} boxSize={10} color="whiteAlpha.300" mx="auto" mb={3} />
          <Text fontSize="md" fontWeight="medium" color="whiteAlpha.700">
            Không tìm thấy ứng viên nào phù hợp
          </Text>
        </Box>
      ) : (
        <Box bg="dark.800" borderWidth="1px" borderColor="dark.border" borderRadius="xl" overflow="hidden">
          <Box overflowX="auto">
            <Table variant="simple" size="sm">
              <Thead bg="dark.850">
                <Tr>
                  <Th color="whiteAlpha.600" py={3.5} fontSize="11px" cursor="pointer" onClick={() => requestSort('MSSV')}>
                    MSSV {getSortIcon('MSSV')}
                  </Th>
                  <Th color="whiteAlpha.600" py={3.5} fontSize="11px" cursor="pointer" onClick={() => requestSort('name')}>
                    Họ và tên {getSortIcon('name')}
                  </Th>
                  <Th color="whiteAlpha.600" py={3.5} fontSize="11px" cursor="pointer" onClick={() => requestSort('specialist')}>
                    Mảng chính {getSortIcon('specialist')}
                  </Th>
                  <Th color="whiteAlpha.600" py={3.5} fontSize="11px">CV</Th>
                  <Th color="whiteAlpha.600" py={3.5} fontSize="11px" cursor="pointer" onClick={() => requestSort('state')}>
                    Trạng thái {getSortIcon('state')}
                  </Th>
                  <Th color="whiteAlpha.600" py={3.5} fontSize="11px">Check-in</Th>
                  <Th color="whiteAlpha.600" py={3.5} fontSize="11px">Tiến trình PV</Th>
                  <Th color="whiteAlpha.600" py={3.5} fontSize="11px" textAlign="right">Thao tác</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredMembers.map((member) => {
                  const badgeStyle = STATE_BADGE_PROPS[member.state] || {
                    bg: 'dark.700',
                    color: 'white',
                    borderColor: 'dark.border',
                  };

                  let advanceLabel = null;
                  let advanceColor = 'primary';
                  if (member.state === 'Đã checkin') {
                    advanceLabel = 'Gọi PV';
                    advanceColor = 'warning';
                  } else if (member.state === 'Gọi PV') {
                    advanceLabel = 'Bắt đầu PV';
                    advanceColor = 'secondary';
                  } else if (member.state === 'Đang phỏng vấn') {
                    advanceLabel = 'Kết thúc PV';
                    advanceColor = 'success';
                  }

                  return (
                    <Tr
                      key={member.id}
                      _hover={{ bg: 'dark.750' }}
                      transition="background-color 0.15s"
                      borderColor="dark.border"
                    >
                      <Td py={3}>
                        <Text fontSize="xs" fontWeight="bold" fontFamily="mono" color="primary.500">
                          {member.MSSV}
                        </Text>
                      </Td>

                      <Td py={3}>
                        <Text fontWeight="semibold" color="white" fontSize="sm">
                          {member.name}
                        </Text>
                        {member.phone && (
                          <Text fontSize="xs" color="whiteAlpha.500">
                            {member.phone}
                          </Text>
                        )}
                      </Td>

                      <Td py={3}>
                        <Badge bg="dark.700" color="whiteAlpha.800" fontSize="xs">
                          {member.specialist}
                        </Badge>
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
                            CV
                          </Button>
                        ) : (
                          <Text color="whiteAlpha.400" fontSize="xs">-</Text>
                        )}
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
                      </Td>

                      <Td py={3}>
                        <Text fontSize="xs" color="whiteAlpha.700">
                          {member.checkin_time || '-'}
                        </Text>
                      </Td>

                      <Td py={3}>
                        {advanceLabel ? (
                          <Button
                            size="xs"
                            colorScheme={advanceColor}
                            rightIcon={<FaArrowRight />}
                            onClick={() => handleAdvanceState(member)}
                            isLoading={isAdvancingId === member.id}
                          >
                            {advanceLabel}
                          </Button>
                        ) : (
                          <Text fontSize="xs" color="whiteAlpha.400">-</Text>
                        )}
                      </Td>

                      <Td py={3} textAlign="right">
                        <HStack spacing={1} justify="flex-end">
                          <Tooltip label="Chỉnh sửa" hasArrow bg="dark.800" color="white">
                            <IconButton
                              size="xs"
                              variant="ghost"
                              icon={<EditIcon />}
                              color="whiteAlpha.700"
                              _hover={{ bg: 'dark.700', color: 'white' }}
                              onClick={() => openEditModal(member)}
                            />
                          </Tooltip>
                          <Tooltip label="Xoá ứng viên" hasArrow bg="dark.800" color="white">
                            <IconButton
                              size="xs"
                              variant="ghost"
                              icon={<DeleteIcon />}
                              color="danger.500"
                              _hover={{ bg: 'rgba(245, 34, 45, 0.12)', color: 'danger.500' }}
                              onClick={() => handleDeleteClick(member)}
                            />
                          </Tooltip>
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

      {/* Add / Edit Member Modal */}
      {selectedMember && (
        <Modal isOpen={isEditOpen} onClose={handleModalClose} size="lg" isCentered>
          <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(4px)" />
          <ModalContent bg="dark.800" borderColor="dark.border" borderWidth="1px" borderRadius="xl">
            <ModalHeader borderBottomWidth="1px" borderColor="dark.border" py={4}>
              <Text fontSize="md" fontWeight="bold" color="white">
                {selectedMember.id ? 'Chỉnh sửa thông tin ứng viên' : 'Thêm ứng viên mới'}
              </Text>
            </ModalHeader>
            <ModalCloseButton color="whiteAlpha.600" />
            <ModalBody py={5}>
              <VStack spacing={4}>
                <HStack spacing={4} w="full">
                  <FormControl isRequired>
                    <FormLabel fontSize="xs" color="whiteAlpha.800">Họ và tên</FormLabel>
                    <Input
                      value={selectedMember.name || ''}
                      onChange={(e) => setSelectedMember({ ...selectedMember, name: e.target.value })}
                      placeholder="VD: Nguyễn Văn A"
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel fontSize="xs" color="whiteAlpha.800">MSSV</FormLabel>
                    <Input
                      value={selectedMember.MSSV || ''}
                      onChange={(e) => setSelectedMember({ ...selectedMember, MSSV: e.target.value })}
                      placeholder="VD: 20210001"
                    />
                  </FormControl>
                </HStack>

                <HStack spacing={4} w="full">
                  <FormControl>
                    <FormLabel fontSize="xs" color="whiteAlpha.800">Email</FormLabel>
                    <Input
                      value={selectedMember.email || ''}
                      onChange={(e) => setSelectedMember({ ...selectedMember, email: e.target.value })}
                      placeholder="VD: a.nv210001@sis.hust.edu.vn"
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="xs" color="whiteAlpha.800">Số điện thoại</FormLabel>
                    <Input
                      value={selectedMember.phone || ''}
                      onChange={(e) => setSelectedMember({ ...selectedMember, phone: e.target.value })}
                      placeholder="VD: 0987654321"
                    />
                  </FormControl>
                </HStack>

                <HStack spacing={4} w="full">
                  <FormControl isRequired>
                    <FormLabel fontSize="xs" color="whiteAlpha.800">Mảng chuyên môn</FormLabel>
                    <Input
                      value={selectedMember.specialist || ''}
                      onChange={(e) => setSelectedMember({ ...selectedMember, specialist: e.target.value })}
                      placeholder="VD: Lập trình nhúng / Thiết kế mạch"
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="xs" color="whiteAlpha.800">Trạng thái</FormLabel>
                    <Select
                      value={selectedMember.state || 'Đậu vòng đơn'}
                      onChange={(e) => setSelectedMember({ ...selectedMember, state: e.target.value })}
                    >
                      {Object.keys(STATE_BADGE_PROPS).map((st) => (
                        <option key={st} value={st} style={{ background: '#181818', color: 'white' }}>
                          {st}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                </HStack>

                <FormControl>
                  <FormLabel fontSize="xs" color="whiteAlpha.800">Link CV</FormLabel>
                  <Input
                    value={selectedMember.linkCV || ''}
                    onChange={(e) => setSelectedMember({ ...selectedMember, linkCV: e.target.value })}
                    placeholder="VD: https://... hoặc /api/uploads/cv/..."
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="xs" color="whiteAlpha.800">Ghi chú</FormLabel>
                  <Textarea
                    value={selectedMember.note || ''}
                    onChange={(e) => setSelectedMember({ ...selectedMember, note: e.target.value })}
                    placeholder="Ghi chú thêm về ứng viên..."
                    rows={3}
                  />
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter borderTopWidth="1px" borderColor="dark.border">
              <Button variant="ghost" mr={3} onClick={handleModalClose} color="whiteAlpha.700">
                Hủy
              </Button>
              <Button colorScheme="primary" onClick={handleModalSave}>
                Lưu thông tin
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* Delete Dialog */}
      <AlertDialog isOpen={isDeleteOpen} leastDestructiveRef={cancelRef} onClose={onDeleteClose} isCentered>
        <AlertDialogOverlay bg="blackAlpha.800" backdropFilter="blur(4px)">
          <AlertDialogContent bg="dark.800" borderColor="dark.border" borderWidth="1px" borderRadius="xl">
            <AlertDialogHeader fontSize="lg" fontWeight="bold" color="white">
              Xác nhận xoá ứng viên
            </AlertDialogHeader>
            <AlertDialogBody color="whiteAlpha.800">
              Bạn có chắc chắn muốn xoá ứng viên <Text as="span" fontWeight="bold" color="danger.500">{selectedMember?.name}</Text> ({selectedMember?.MSSV}) khỏi hệ thống? Thao tác này không thể hoàn tác.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose} variant="ghost" color="whiteAlpha.700">
                Hủy
              </Button>
              <Button colorScheme="danger" onClick={handleDeleteConfirm} ml={3}>
                Xác nhận xoá
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default Management;