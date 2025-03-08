import React, { useState, useEffect } from 'react';
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
  useColorModeValue,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay
} from '@chakra-ui/react';
import { TriangleDownIcon, TriangleUpIcon, EditIcon, DeleteIcon } from '@chakra-ui/icons'; // Import icons
import api from '../api/axios';
import { BASE_URL } from '../config';

const Management = ({ members, setMembers }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [filterConfig, setFilterConfig] = useState({ name: '', MSSV: '', specialist: '' });
  const [uniqueSpecialists, setUniqueSpecialists] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const cancelRef = React.useRef();

  useEffect(() => {
    const specialists = [...new Set(members.map(member => member.specialist))];
    setUniqueSpecialists(specialists);
  }, [members]);

  const sortedMembers = [...members].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'ascending' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'ascending' ? 1 : -1;
    }
    return 0;
  });

  const filteredMembers = sortedMembers.filter((member) => {
    return (
      member.name.toLowerCase().includes(filterConfig.name.toLowerCase()) &&
      member.MSSV.toLowerCase().includes(filterConfig.MSSV.toLowerCase()) &&
      (filterConfig.specialist === '' || member.specialist === filterConfig.specialist)
    );
  });

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

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilterConfig((prevConfig) => ({
      ...prevConfig,
      [name]: value,
    }));
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
      specialist: '',
      role: '',
      IDcard: ''
    });
    onEditOpen();
  };

  const handleModalClose = () => {
    setSelectedMember(null);
    onEditClose();
  };

  const handleModalSave = () => {
    if (!selectedMember) return;

    const memberData = {
      name: selectedMember.name || '',
      MSSV: selectedMember.MSSV || '',
      specialist: selectedMember.specialist || '',
      role: selectedMember.role || '',
      IDcard: selectedMember.IDcard || ''
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
    setSelectedMember((prevMember) => ({
      ...prevMember,
      [name]: value,
    }));
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
      <Text
        fontSize={{ base: '3xl', md: '30' }}
        fontWeight={'bold'}
        letterSpacing={'2px'}
        textTransform={'uppercase'}
        textAlign={'center'}
        mb={8}
        borderRadius="md"
      >
        <Text
          as={'span'}
          bgGradient={'linear(to-r, pink.400, purple.500)'}
          bgClip={'text'}
        >
          Member Management
        </Text>
      </Text>

      <Box mb={4} borderRadius="md">
        <Input
          placeholder="Search by name"
          name="name"
          value={filterConfig.name}
          onChange={handleFilterChange}
          mb={2}
          borderRadius="md"
        />
        <Input
          placeholder="Search by MSSV"
          name="MSSV"
          value={filterConfig.MSSV}
          onChange={handleFilterChange}
          mb={2}
          borderRadius="md"
        />
        <Select
          placeholder="Filter by specialist"
          name="specialist"
          value={filterConfig.specialist}
          onChange={handleFilterChange}
          borderRadius="md"
        >
          {uniqueSpecialists.map((specialist) => (
            <option key={specialist} value={specialist}>
              {specialist}
            </option>
          ))}
        </Select>
        <Button colorScheme="teal" onClick={() => openEditModal()} borderRadius="md"mt={4} mb={0}>Add Member</Button>
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
              <Th onClick={() => requestSort('specialist')} borderRadius="md">
                Speciality {getSortIcon('specialist')}
              </Th>
              <Th onClick={() => requestSort('role')} borderRadius="md">
                Role {getSortIcon('role')}
              </Th>
              <Th borderRadius="md">Action</Th>
            </Tr>
          </Thead>
          <Tbody borderRadius="md">
            {filteredMembers.map((member) => (
              <Tr key={member.id} borderRadius="md">
                <Td borderRadius="md">{member.MSSV}</Td>
                <Td minWidth="200px" borderRadius="md">{member.name}</Td>
                <Td borderRadius="md">{member.specialist}</Td>
                <Td borderRadius="md">{member.role}</Td>
                <Td borderRadius="md">
                  <IconButton
                    icon={<EditIcon />}
                    onClick={() => openEditModal(member)}
                    mr={2}
                    borderRadius="md"
                  />
                  <IconButton
                    icon={<DeleteIcon />}
                    onClick={() => handleDeleteClick(member)}
                    borderRadius="md"
                  />
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
            <Input
              placeholder="Name"
              name="name"
              value={selectedMember?.name || ''}
              onChange={handleInputChange}
              mb={2}
              borderRadius="md"
            />
            <Input
              placeholder="MSSV"
              name="MSSV"
              value={selectedMember?.MSSV || ''}
              onChange={handleInputChange}
              mb={2}
              borderRadius="md"
            />
            <Input
              placeholder="Specialist"
              name="specialist"
              value={selectedMember?.specialist || ''}
              onChange={handleInputChange}
              mb={2}
              borderRadius="md"
            />
            <Input
              placeholder="Role"
              name="role"
              value={selectedMember?.role || ''}
              onChange={handleInputChange}
              mb={2}
              borderRadius="md"
            />
            <Input
              placeholder="ID Card"
              name="IDcard"
              value={selectedMember?.IDcard || ''}
              onChange={handleInputChange}
              mb={2}
              borderRadius="md"
            />
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
    </Container>
  );
};

export default Management;