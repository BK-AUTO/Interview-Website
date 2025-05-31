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
  Badge
} from '@chakra-ui/react';
import { TriangleDownIcon, TriangleUpIcon, EditIcon, DeleteIcon, ViewIcon, ArrowBackIcon } from '@chakra-ui/icons'; // Import icons
import api from '../api/axios';
import { BASE_URL } from '../config';

const Management = ({ members, setMembers }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [selectedMember, setSelectedMember] = useState(null);
  const [checkinMember, setCheckinMember] = useState(null);
  const [lotteryNumber, setLotteryNumber] = useState('');
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const { isOpen: isCheckinOpen, onOpen: onCheckinOpen, onClose: onCheckinClose } = useDisclosure();
  const cancelRef = React.useRef();
  const toast = useToast();

  const sortedMembers = [...members].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'ascending' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'ascending' ? 1 : -1;
    }
    return 0;
  });

  // Use all sorted members instead of filtering
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
      MSSV: '',
      khoa: '',
      organization: '',
      join_year: '',
      former_role: '',
      lottery_number: '',
      state: 'Chưa checkin',
      checkin_time: ''
    });
    onEditOpen();
  };

  const handleModalClose = () => {
    setSelectedMember(null);
    onEditClose();
  };

  const handleModalSave = () => {
    if (!selectedMember) return;

    // Convert datetime-local to the format expected by backend
    let checkinTime = selectedMember.checkin_time;
    if (checkinTime && selectedMember.state === 'Đã checkin') {
      // Convert from datetime-local format to ISO string
      const date = new Date(checkinTime);
      checkinTime = date.toISOString().slice(0, 19).replace('T', ' ');
    }

    const memberData = {
      name: selectedMember.name || '',
      MSSV: selectedMember.MSSV || '',
      khoa: selectedMember.khoa || '',
      organization: selectedMember.organization || '',
      join_year: selectedMember.join_year || '',
      former_role: selectedMember.former_role || '',
      lottery_number: selectedMember.lottery_number || null,
      state: selectedMember.state || 'Chưa checkin',
      checkin_time: checkinTime || ''
    };

    if (selectedMember.id) {
      // Edit existing member
      handleEditMember(selectedMember.id, memberData);
    } else {
      // Add new member
      handleAddMember(memberData);
    }
    handleModalClose();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSelectedMember((prevMember) => {
      const updatedMember = {
        ...prevMember,
        [name]: value,
      };

      // If changing state to "Đã checkin" and there's no checkin_time, set current time
      if (name === 'state' && value === 'Đã checkin' && !prevMember.checkin_time) {
        const currentTime = new Date().toLocaleString('sv-SE', {
          timeZone: 'Asia/Ho_Chi_Minh'
        }).replace(' ', 'T');
        updatedMember.checkin_time = currentTime;
      }
      
      // If changing state to "Chưa checkin", clear checkin_time
      if (name === 'state' && value === 'Chưa checkin') {
        updatedMember.checkin_time = '';
      }

      return updatedMember;
    });
  };

  const handleCheckinClick = (member) => {
    setCheckinMember(member);
    setLotteryNumber('');
    onCheckinOpen();
  };

  const handleCheckinConfirm = async () => {
    if (!lotteryNumber.trim()) {
      toast({
        title: "Lottery number required",
        description: "Please enter a lottery number",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const response = await api.post('/api/checkin', {
        uid: checkinMember.MSSV || checkinMember.name,
        lottery_number: parseInt(lotteryNumber.trim())
      });

      if (response.data && response.data.member) {
        // Update the member in the local state
        setMembers(members.map(m => 
          m.id === checkinMember.id ? response.data.member : m
        ));
        
        toast({
          title: "Check-in successful",
          description: `${checkinMember.name} has been checked in with lottery number ${lotteryNumber}`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        
        onCheckinClose();
      }
    } catch (error) {
      console.error('Check-in error:', error);
      const errorMessage = error.response?.data?.message || 'Check-in failed';
      toast({
        title: "Check-in failed",
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

  return (
    <Container maxW={'2000px'} my={4} display="flex" flexDirection="column" height="calc(100vh - 160px)" overflow="hidden" borderRadius="md">

      <Box mb={4} borderRadius="md">
        <Button colorScheme="teal" onClick={() => openEditModal()} borderRadius="md" mb={4}>Add Member</Button>
      </Box>
      <Box overflowY="auto" flex="1" borderRadius="md">
        <Table variant="simple" borderRadius="md">
          <Thead position="sticky" top={0} bg={useColorModeValue("gray.50", "gray.900")} zIndex={1} borderRadius="md">
            <Tr>
              <Th onClick={() => requestSort('MSSV')} borderRadius="md">
                MSSV {getSortIcon('MSSV')}
              </Th>
              <Th onClick={() => requestSort('name')} borderRadius="md">
                Name {getSortIcon('name')}
              </Th>
              <Th onClick={() => requestSort('khoa')} borderRadius="md">
                Khoa {getSortIcon('khoa')}
              </Th>
              <Th onClick={() => requestSort('organization')} borderRadius="md">
                Organization {getSortIcon('organization')}
              </Th>
              <Th onClick={() => requestSort('join_year')} borderRadius="md">
                Join Year {getSortIcon('join_year')}
              </Th>
              <Th onClick={() => requestSort('former_role')} borderRadius="md">
                Former Role {getSortIcon('former_role')}
              </Th>
              <Th onClick={() => requestSort('lottery_number')} borderRadius="md">
                Lottery Number {getSortIcon('lottery_number')}
              </Th>
              <Th onClick={() => requestSort('state')} borderRadius="md">
                Status {getSortIcon('state')}
              </Th>
              <Th onClick={() => requestSort('checkin_time')} borderRadius="md">
                Check-in Time {getSortIcon('checkin_time')}
              </Th>
              <Th borderRadius="md">Action</Th>
            </Tr>
          </Thead>
          <Tbody borderRadius="md">
            {displayedMembers.map((member) => (
              <Tr key={member.id} borderRadius="md">
                <Td borderRadius="md">{member.MSSV}</Td>
                <Td minWidth="200px" borderRadius="md">{member.name}</Td>
                <Td borderRadius="md">{member.khoa}</Td>
                <Td borderRadius="md">{member.organization}</Td>
                <Td borderRadius="md">{member.join_year}</Td>
                <Td borderRadius="md">{member.former_role}</Td>
                <Td borderRadius="md">{member.lottery_number || 'N/A'}</Td>
                <Td borderRadius="md">
                  {member.state && (
                    <Text
                      color={member.state === 'Đã checkin' ? 'green.500' : 'red.500'}
                      fontWeight="bold"
                    >
                      {member.state}
                    </Text>
                  )}
                </Td>
                <Td borderRadius="md">
                  {member.checkin_time ? 
                    new Date(member.checkin_time).toLocaleString('vi-VN', {
                      timeZone: 'Asia/Ho_Chi_Minh',
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false
                    }) : 'N/A'
                  }
                </Td>
                <Td borderRadius="md">
                  <IconButton
                    icon={<EditIcon />}
                    onClick={() => openEditModal(member)}
                    mr={2}
                    borderRadius="md"
                    size="sm"
                  />
                  <IconButton
                    icon={<DeleteIcon />}
                    onClick={() => handleDeleteClick(member)}
                    mr={2}
                    borderRadius="md"
                    size="sm"
                  />
                  {/* Check-in button - only show if not checked in */}
                  {member.state !== 'Đã checkin' && (
                    <Button
                      size="sm"
                      colorScheme="blue"
                      onClick={() => handleCheckinClick(member)}
                      borderRadius="md"
                    >
                      Check-in
                    </Button>
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      <Modal isOpen={isEditOpen} onClose={handleModalClose} borderRadius="md">
        <ModalOverlay />
        <ModalContent borderRadius="md">
          <ModalHeader borderRadius="md">{selectedMember?.id ? 'Edit Member' : 'Add Member'}</ModalHeader>
          <ModalCloseButton borderRadius="md" />
          <ModalBody borderRadius="md">
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Tên</FormLabel>
                <Input
                  placeholder="Name"
                  name="name"
                  value={selectedMember?.name || ''}
                  onChange={handleInputChange}
                  borderRadius="md"
                />
              </FormControl>

              <FormControl>
                <FormLabel>MSSV</FormLabel>
                <Input
                  placeholder="MSSV"
                  name="MSSV"
                  value={selectedMember?.MSSV || ''}
                  onChange={handleInputChange}
                  borderRadius="md"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Khoa</FormLabel>
                <Input
                  placeholder="Khoa"
                  name="khoa"
                  value={selectedMember?.khoa || ''}
                  onChange={handleInputChange}
                  borderRadius="md"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Tổ chức</FormLabel>
                <Input
                  placeholder="Organization"
                  name="organization"
                  value={selectedMember?.organization || ''}
                  onChange={handleInputChange}
                  borderRadius="md"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Năm tham gia</FormLabel>
                <Input
                  placeholder="Join Year"
                  name="join_year"
                  value={selectedMember?.join_year || ''}
                  onChange={handleInputChange}
                  borderRadius="md"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Vai trò cũ</FormLabel>
                <Input
                  placeholder="Former Role"
                  name="former_role"
                  value={selectedMember?.former_role || ''}
                  onChange={handleInputChange}
                  borderRadius="md"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Số bốc thăm</FormLabel>
                <Input
                  placeholder="Lottery Number"
                  name="lottery_number"
                  type="number"
                  value={selectedMember?.lottery_number || ''}
                  onChange={handleInputChange}
                  borderRadius="md"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Trạng thái check-in</FormLabel>
                <Select
                  name="state"
                  value={selectedMember?.state || 'Chưa checkin'}
                  onChange={handleInputChange}
                  borderRadius="md"
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
                    placeholder="Check-in Time"
                    name="checkin_time"
                    type="datetime-local"
                    value={selectedMember?.checkin_time || ''}
                    onChange={handleInputChange}
                    borderRadius="md"
                  />
                </FormControl>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter borderRadius="md">
            <Button colorScheme="blue" mr={3} onClick={handleModalSave} borderRadius="md">
              Save
            </Button>
            <Button variant="ghost" onClick={handleModalClose} borderRadius="md">Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
        borderRadius="md"
      >
        <AlertDialogOverlay borderRadius="md">
          <AlertDialogContent borderRadius="md">
            <AlertDialogHeader fontSize="lg" fontWeight="bold" borderRadius="md">
              Delete Member
            </AlertDialogHeader>

            <AlertDialogBody borderRadius="md">
              Are you sure you want to delete {selectedMember?.name}? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter borderRadius="md">
              <Button ref={cancelRef} onClick={onDeleteClose} borderRadius="md">
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDeleteConfirm} ml={3} borderRadius="md">
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Check-in Modal */}
      <Modal isOpen={isCheckinOpen} onClose={onCheckinClose} borderRadius="md">
        <ModalOverlay />
        <ModalContent borderRadius="md">
          <ModalHeader borderRadius="md">Check-in {checkinMember?.name}</ModalHeader>
          <ModalCloseButton borderRadius="md" />
          <ModalBody borderRadius="md">
            <Text mb={4}>
              Checking in: <strong>{checkinMember?.name}</strong> (MSSV: {checkinMember?.MSSV})
            </Text>
            <Input
              placeholder="Enter lottery number"
              type="number"
              value={lotteryNumber}
              onChange={(e) => setLotteryNumber(e.target.value)}
              borderRadius="md"
            />
          </ModalBody>
          <ModalFooter borderRadius="md">
            <Button colorScheme="blue" mr={3} onClick={handleCheckinConfirm} borderRadius="md">
              Check-in
            </Button>
            <Button variant="ghost" onClick={onCheckinClose} borderRadius="md">Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
};

export default Management;