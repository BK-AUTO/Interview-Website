import React, { useState } from 'react';
import {
  Container,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Input,
  Box,
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
  useColorModeValue,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useToast,
  HStack,
  Select,
  FormControl,
  FormLabel,
  VStack,
  Badge,
  InputGroup,
  InputLeftElement,
  Flex,
  Tooltip
} from '@chakra-ui/react';
import { TriangleDownIcon, TriangleUpIcon, EditIcon, DeleteIcon, SearchIcon, CheckIcon } from '@chakra-ui/icons';
import api from '../api/axios';

const Management = ({ members, setMembers }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [selectedMember, setSelectedMember] = useState(null);
  const [checkinMember, setCheckinMember] = useState(null);
  const [checkinType, setCheckinType] = useState('both');
  const [searchTerm, setSearchTerm] = useState('');
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const { isOpen: isCheckinOpen, onOpen: onCheckinOpen, onClose: onCheckinClose } = useDisclosure();
  const cancelRef = React.useRef();
  const toast = useToast();

  // Filter members based on search
  const filteredMembers = members.filter(member => {
    if (!searchTerm.trim()) return true;
    const search = searchTerm.toLowerCase();
    return (
      member.name?.toLowerCase().includes(search) ||
      member.MSSV?.toLowerCase().includes(search) ||
      member.khoa?.toLowerCase().includes(search)
    );
  });

  const sortedMembers = [...filteredMembers].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aVal = a[sortConfig.key] || '';
    const bVal = b[sortConfig.key] || '';
    if (aVal < bVal) {
      return sortConfig.direction === 'ascending' ? -1 : 1;
    }
    if (aVal > bVal) {
      return sortConfig.direction === 'ascending' ? 1 : -1;
    }
    return 0;
  });

  const displayedMembers = sortedMembers;

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'ascending' ? <TriangleUpIcon /> : <TriangleDownIcon />;
    }
    return null;
  };

  const handleAddMember = async (member) => {
    try {
      const response = await api.post('/api/members', member);
      setMembers((prevMembers) => [...prevMembers, response.data.member]);
    } catch (error) {
      console.error('Error adding member:', error);
    }
  };

  const handleEditMember = async (id, updatedMember) => {
    try {
      const response = await api.put(`/api/members/${id}`, updatedMember);
      setMembers((prevMembers) =>
        prevMembers.map((member) => (member.id === id ? response.data.member : member))
      );
    } catch (error) {
      console.error('Error editing member:', error);
    }
  };

  const handleDeleteMember = async (id) => {
    try {
      await api.delete(`/api/members/${id}`);
      setMembers((prevMembers) => prevMembers.filter((member) => member.id !== id));
    } catch (error) {
      console.error('Error deleting member:', error);
    }
  };

  const openEditModal = (member) => {
    setSelectedMember(member || {
      name: '',
      khoa: '',
      MSSV: '',
      participation_type: '',
      member_type: 'CURRENT',
      state: 'Chưa checkin',
      checkin_time: '',
      checkin_ceremony: false,
      checkin_party: false
    });
    onEditOpen();
  };

  const handleModalClose = () => {
    setSelectedMember(null);
    onEditClose();
  };

  const handleModalSave = () => {
    if (!selectedMember) return;

    let checkinTime = selectedMember.checkin_time;
    if (checkinTime && selectedMember.state === 'Đã checkin') {
      const date = new Date(checkinTime);
      checkinTime = date.toISOString().slice(0, 19).replace('T', ' ');
    }

    const memberData = {
      name: selectedMember.name || '',
      khoa: selectedMember.khoa || '',
      MSSV: selectedMember.MSSV || '',
      participation_type: selectedMember.participation_type || '',
      member_type: selectedMember.member_type || 'CURRENT',
      state: selectedMember.state || 'Chưa checkin',
      checkin_time: checkinTime || '',
      checkin_ceremony: selectedMember.checkin_ceremony || false,
      checkin_party: selectedMember.checkin_party || false
    };

    if (selectedMember.id) {
      handleEditMember(selectedMember.id, memberData);
    } else {
      handleAddMember(memberData);
    }
    handleModalClose();
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSelectedMember((prevMember) => {
      const updatedMember = {
        ...prevMember,
        [name]: type === 'checkbox' ? checked : value,
      };

      if (name === 'state' && value === 'Đã checkin' && !prevMember.checkin_time) {
        const currentTime = new Date().toLocaleString('sv-SE', {
          timeZone: 'Asia/Ho_Chi_Minh'
        }).replace(' ', 'T');
        updatedMember.checkin_time = currentTime;
      }
      
      if (name === 'state' && value === 'Chưa checkin') {
        updatedMember.checkin_time = '';
        updatedMember.checkin_ceremony = false;
        updatedMember.checkin_party = false;
      }

      return updatedMember;
    });
  };

  const handleCheckinClick = (member) => {
    setCheckinMember(member);
    // Determine default checkin type based on participation_type
    if (member.participation_type === 'Phần lễ') {
      setCheckinType('ceremony');
    } else if (member.participation_type === 'Phần hội') {
      setCheckinType('party');
    } else {
      setCheckinType('both');
    }
    onCheckinOpen();
  };

  const handleCheckinConfirm = async () => {
    try {
      const response = await api.post('/api/checkin', {
        uid: checkinMember.MSSV || checkinMember.name,
        checkin_type: checkinType
      });

      if (response.data && response.data.member) {
        setMembers(members.map(m => 
          m.id === checkinMember.id ? response.data.member : m
        ));
        
        const typeLabel = checkinType === 'ceremony' ? 'phần Lễ' : 
                          checkinType === 'party' ? 'phần Hội' : 'cả hai phần';
        toast({
          title: "Check-in thành công",
          description: `${checkinMember.name} đã check-in ${typeLabel}`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        
        onCheckinClose();
      }
    } catch (error) {
      console.error('Check-in error:', error);
      const errorMessage = error.response?.data?.message || 'Check-in thất bại';
      toast({
        title: "Check-in thất bại",
        description: errorMessage,
        status: "error",
        duration: 3000,
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
      setMembers(members.filter((m) => m.id !== selectedMember.id));
      onDeleteClose();
    } catch (error) {
      console.error('Error deleting member:', error);
    }
  };

  const getMemberTypeBadge = (type) => {
    if (type === 'CSV') {
      return <Badge colorScheme="purple" fontSize="xs">CSV</Badge>;
    }
    return <Badge colorScheme="blue" fontSize="xs">SV</Badge>;
  };

  const getParticipationBadge = (type) => {
    if (!type) return <Badge colorScheme="gray" fontSize="xs">-</Badge>;
    if (type === 'Cả hai') return <Badge colorScheme="green" fontSize="xs">Cả hai</Badge>;
    if (type === 'Phần lễ') return <Badge colorScheme="orange" fontSize="xs">Lễ</Badge>;
    if (type === 'Phần hội') return <Badge colorScheme="pink" fontSize="xs">Hội</Badge>;
    return <Badge colorScheme="gray" fontSize="xs">{type}</Badge>;
  };

  const headerBg = useColorModeValue("orange.50", "gray.900");
  const tableBg = useColorModeValue("white", "gray.800");

  return (
    <Container maxW={'2000px'} my={4} display="flex" flexDirection="column" height="calc(100vh - 160px)" overflow="hidden" borderRadius="md">
      {/* Search and Add Section */}
      <Flex mb={4} gap={4} align="center" flexWrap="wrap">
        <InputGroup maxW="400px">
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="gray.400" />
          </InputLeftElement>
          <Input
            placeholder="Tìm theo tên, MSSV, khóa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            borderRadius="lg"
            bg={tableBg}
          />
        </InputGroup>
        <Button colorScheme="orange" onClick={() => openEditModal()} borderRadius="lg" leftIcon={<CheckIcon />}>
          Thêm thành viên
        </Button>
        <Badge colorScheme="blue" fontSize="md" px={3} py={1} borderRadius="full">
          Tổng: {filteredMembers.length} / {members.length}
        </Badge>
      </Flex>

      {/* Table */}
      <Box overflowY="auto" flex="1" borderRadius="xl" boxShadow="lg" bg={tableBg}>
        <Table variant="simple" size="sm">
          <Thead position="sticky" top={0} bg={headerBg} zIndex={1}>
            <Tr>
              <Th onClick={() => requestSort('name')} cursor="pointer" py={4}>
                Tên {getSortIcon('name')}
              </Th>
              <Th onClick={() => requestSort('khoa')} cursor="pointer">
                Khóa {getSortIcon('khoa')}
              </Th>
              <Th onClick={() => requestSort('MSSV')} cursor="pointer">
                MSSV {getSortIcon('MSSV')}
              </Th>
              <Th onClick={() => requestSort('member_type')} cursor="pointer">
                Loại {getSortIcon('member_type')}
              </Th>
              <Th onClick={() => requestSort('participation_type')} cursor="pointer">
                Phần tham gia {getSortIcon('participation_type')}
              </Th>
              <Th textAlign="center">Check-in Lễ</Th>
              <Th textAlign="center">Check-in Hội</Th>
              <Th onClick={() => requestSort('state')} cursor="pointer">
                Trạng thái {getSortIcon('state')}
              </Th>
              <Th onClick={() => requestSort('checkin_time')} cursor="pointer">
                Thời gian {getSortIcon('checkin_time')}
              </Th>
              <Th>Thao tác</Th>
            </Tr>
          </Thead>
          <Tbody>
            {displayedMembers.map((member) => (
              <Tr key={member.id} _hover={{ bg: useColorModeValue('orange.50', 'gray.700') }}>
                <Td fontWeight="medium" minW="180px">{member.name}</Td>
                <Td>
                  <Badge colorScheme="teal" variant="subtle">{member.khoa || '-'}</Badge>
                </Td>
                <Td>{member.MSSV || '-'}</Td>
                <Td>{getMemberTypeBadge(member.member_type)}</Td>
                <Td>{getParticipationBadge(member.participation_type)}</Td>
                <Td textAlign="center">
                  {member.checkin_ceremony ? (
                    <Badge colorScheme="green" variant="solid">✓</Badge>
                  ) : (
                    <Badge colorScheme="gray" variant="outline">-</Badge>
                  )}
                </Td>
                <Td textAlign="center">
                  {member.checkin_party ? (
                    <Badge colorScheme="green" variant="solid">✓</Badge>
                  ) : (
                    <Badge colorScheme="gray" variant="outline">-</Badge>
                  )}
                </Td>
                <Td>
                  <Text
                    color={member.state === 'Đã checkin' ? 'green.500' : 'orange.500'}
                    fontWeight="bold"
                    fontSize="sm"
                  >
                    {member.state || 'Chưa checkin'}
                  </Text>
                </Td>
                <Td fontSize="xs">
                  {member.checkin_time ? 
                    new Date(member.checkin_time).toLocaleString('vi-VN', {
                      timeZone: 'Asia/Ho_Chi_Minh',
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    }) : '-'
                  }
                </Td>
                <Td>
                  <HStack spacing={1}>
                    <Tooltip label="Sửa">
                      <IconButton
                        icon={<EditIcon />}
                        onClick={() => openEditModal(member)}
                        size="sm"
                        colorScheme="blue"
                        variant="ghost"
                      />
                    </Tooltip>
                    <Tooltip label="Xóa">
                      <IconButton
                        icon={<DeleteIcon />}
                        onClick={() => handleDeleteClick(member)}
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                      />
                    </Tooltip>
                    {!(member.checkin_ceremony && member.checkin_party) && (
                      <Button
                        size="sm"
                        colorScheme="orange"
                        onClick={() => handleCheckinClick(member)}
                        fontSize="xs"
                      >
                        Check-in
                      </Button>
                    )}
                  </HStack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      {/* Edit/Add Modal */}
      <Modal isOpen={isEditOpen} onClose={handleModalClose} size="lg">
        <ModalOverlay />
        <ModalContent borderRadius="xl">
          <ModalHeader bg="orange.50" borderTopRadius="xl">
            {selectedMember?.id ? 'Sửa thành viên' : 'Thêm thành viên mới'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={6}>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired>
                <FormLabel>Họ và tên</FormLabel>
                <Input
                  placeholder="Nhập họ và tên"
                  name="name"
                  value={selectedMember?.name || ''}
                  onChange={handleInputChange}
                />
              </FormControl>

              <HStack spacing={4}>
                <FormControl>
                  <FormLabel>Khóa</FormLabel>
                  <Select
                    name="khoa"
                    value={selectedMember?.khoa || ''}
                    onChange={handleInputChange}
                    placeholder="Chọn khóa"
                  >
                    <option value="K61">K61</option>
                    <option value="K62">K62</option>
                    <option value="K63">K63</option>
                    <option value="K64">K64</option>
                    <option value="K65">K65</option>
                    <option value="K66">K66</option>
                    <option value="K67">K67</option>
                    <option value="K68">K68</option>
                    <option value="K69">K69</option>
                    <option value="K70">K70</option>
                    <option value="NCS">NCS</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>MSSV</FormLabel>
                  <Input
                    placeholder="Nhập MSSV"
                    name="MSSV"
                    value={selectedMember?.MSSV || ''}
                    onChange={handleInputChange}
                  />
                </FormControl>
              </HStack>

              <HStack spacing={4}>
                <FormControl>
                  <FormLabel>Loại thành viên</FormLabel>
                  <Select
                    name="member_type"
                    value={selectedMember?.member_type || 'CURRENT'}
                    onChange={handleInputChange}
                  >
                    <option value="CSV">Cựu sinh viên (CSV)</option>
                    <option value="CURRENT">Sinh viên hiện tại</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Phần tham gia</FormLabel>
                  <Select
                    name="participation_type"
                    value={selectedMember?.participation_type || ''}
                    onChange={handleInputChange}
                    placeholder="Chọn phần tham gia"
                  >
                    <option value="Cả hai">Cả hai (Lễ + Hội)</option>
                    <option value="Phần lễ">Phần lễ</option>
                    <option value="Phần hội">Phần hội</option>
                  </Select>
                </FormControl>
              </HStack>

              <FormControl>
                <FormLabel>Trạng thái check-in</FormLabel>
                <Select
                  name="state"
                  value={selectedMember?.state || 'Chưa checkin'}
                  onChange={handleInputChange}
                >
                  <option value="Chưa checkin">Chưa checkin</option>
                  <option value="Đã checkin">Đã checkin</option>
                </Select>
              </FormControl>

              {selectedMember?.state === 'Đã checkin' && (
                <FormControl>
                  <FormLabel>
                    Thời gian check-in 
                    <Badge ml={2} colorScheme="blue" fontSize="xs">GMT+7</Badge>
                  </FormLabel>
                  <Input
                    name="checkin_time"
                    type="datetime-local"
                    value={selectedMember?.checkin_time || ''}
                    onChange={handleInputChange}
                  />
                </FormControl>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="orange" mr={3} onClick={handleModalSave}>
              Lưu
            </Button>
            <Button variant="ghost" onClick={handleModalClose}>Hủy</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent borderRadius="xl">
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Xóa thành viên
            </AlertDialogHeader>
            <AlertDialogBody>
              Bạn có chắc muốn xóa <strong>{selectedMember?.name}</strong>? Hành động này không thể hoàn tác.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                Hủy
              </Button>
              <Button colorScheme="red" onClick={handleDeleteConfirm} ml={3}>
                Xóa
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Check-in Modal */}
      <Modal isOpen={isCheckinOpen} onClose={onCheckinClose}>
        <ModalOverlay />
        <ModalContent borderRadius="xl">
          <ModalHeader bg="orange.50" borderTopRadius="xl">
            Check-in: {checkinMember?.name}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={6}>
            <VStack spacing={4} align="stretch">
              <Box p={4} bg="gray.50" borderRadius="lg">
                <Text fontSize="sm" color="gray.600">
                  <strong>Tên:</strong> {checkinMember?.name}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  <strong>Khóa:</strong> {checkinMember?.khoa || 'N/A'}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  <strong>MSSV:</strong> {checkinMember?.MSSV || 'N/A'}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  <strong>Phần đăng ký:</strong> {checkinMember?.participation_type || 'Không xác định'}
                </Text>
              </Box>

              <FormControl>
                <FormLabel>Loại check-in</FormLabel>
                <Select
                  value={checkinType}
                  onChange={(e) => setCheckinType(e.target.value)}
                >
                  <option value="both">Cả hai (Lễ + Hội)</option>
                  <option value="ceremony">Chỉ phần Lễ</option>
                  <option value="party">Chỉ phần Hội</option>
                </Select>
              </FormControl>

            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="orange" mr={3} onClick={handleCheckinConfirm} size="lg">
              ✓ Check-in
            </Button>
            <Button variant="ghost" onClick={onCheckinClose}>Hủy</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
};

export default Management;
