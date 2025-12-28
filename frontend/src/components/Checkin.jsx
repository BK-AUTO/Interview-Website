import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  useDisclosure,
  FormControl,
  FormLabel,
  Flex,
  Input,
  useToast,
  Spinner,
  VStack,
  HStack,
  Text,
  Badge,
  Divider,
  InputGroup,
  InputLeftElement,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  IconButton,
  useColorModeValue
} from '@chakra-ui/react';
import { AiOutlineCheckCircle } from "react-icons/ai";
import { SearchIcon } from '@chakra-ui/icons';
import api from '../api/axios';

const Checkin = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [uid, setUid] = useState('');
  const [checkinType, setCheckinType] = useState('both');
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const toast = useToast();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Load members data
  useEffect(() => {
    const fetchMembers = async () => {
      setLoadingMembers(true);
      try {
        const response = await api.get('/api/members');
        setMembers(response.data);
        setFilteredMembers(response.data);
      } catch (error) {
        console.error('Error fetching members:', error);
        toast({
          title: "Error loading members",
          description: "Unable to load member list",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setLoadingMembers(false);
      }
    };

    if (isOpen) {
      fetchMembers();
    }
  }, [isOpen, toast]);

  // Filter members based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredMembers(members);
    } else {
      const filtered = members.filter(member =>
        member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.MSSV?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.khoa?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredMembers(filtered);
    }
  }, [searchTerm, members]);

  const handleMemberSelect = (member) => {
    setUid(member.MSSV || member.name);
    // Set default checkin type based on participation
    if (member.participation_type === 'Phần lễ') {
      setCheckinType('ceremony');
    } else if (member.participation_type === 'Phần hội') {
      setCheckinType('party');
    } else {
      setCheckinType('both');
    }
  };

  const handleCheckin = async () => {
    if (!uid.trim()) {
      toast({
        title: "Yêu cầu thông tin",
        description: "Vui lòng nhập MSSV hoặc Tên",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/checkin', { 
        uid: uid.trim(), 
        checkin_type: checkinType
      });
      
      if (response.data && response.data.member) {
        const { name, khoa, checkin_time } = response.data.member;
        
        // Format the date for display with Vietnam timezone
        let formattedTime = checkin_time || new Date().toLocaleString('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh'
        });
        try {
          if (checkin_time) {
            const date = new Date(checkin_time);
            if (!isNaN(date.getTime())) {
              formattedTime = date.toLocaleString('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              });
            }
          }
        } catch (e) {
          console.error('Error formatting date:', e);
        }
        
        const typeLabel = checkinType === 'ceremony' ? 'phần Lễ' : 
                          checkinType === 'party' ? 'phần Hội' : 'cả hai phần';
        
        toast({
          title: `${name} check-in thành công`,
          description: `Thành viên ${name} (${khoa || 'N/A'}) đã check-in ${typeLabel} lúc ${formattedTime}`,
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        setUid('');
        setCheckinType('both');
        onClose();
      }
    } catch (error) {
      console.error('Check-in error:', error);
      const errorResponse = error.response?.data || {};
      
      const errorMessage = errorResponse.message || errorResponse.error || 'Unable to check-in. Please try again.';
      toast({
        title: "Check-in failed",
        description: errorMessage,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={onOpen}>
        <AiOutlineCheckCircle size={20} />
      </Button>

      <Modal isOpen={isOpen} onClose={onClose} size="6xl">
        <ModalOverlay />
        <ModalContent maxH="90vh">
          <ModalHeader bg="orange.50">🎉 YEP 2025 - Check-in</ModalHeader>
          <ModalCloseButton />
          <ModalBody overflowY="auto">
            <VStack spacing={6} align="stretch">
              {/* Search Section */}
              <Box>
                <Text fontSize="lg" fontWeight="bold" mb={3}>
                  🔍 Tìm kiếm thành viên
                </Text>
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <SearchIcon color="orange.400" />
                  </InputLeftElement>
                  <Input
                    placeholder="Tìm theo tên, MSSV, khóa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    focusBorderColor="orange.400"
                  />
                </InputGroup>
              </Box>

              <Divider />

              {/* Member List */}
              <Box>
                <Text fontSize="lg" fontWeight="bold" mb={3}>
                  📋 Danh sách thành viên
                  {searchTerm && (
                    <Badge ml={2} colorScheme="blue">
                      {filteredMembers.length} kết quả
                    </Badge>
                  )}
                </Text>
                
                {loadingMembers ? (
                  <Flex justify="center" py={8}>
                    <Spinner size="lg" />
                  </Flex>
                ) : (
                  <TableContainer 
                    maxH="300px" 
                    overflowY="auto"
                    border="1px"
                    borderColor={borderColor}
                    borderRadius="md"
                  >
                    <Table variant="simple" size="sm">
                      <Thead position="sticky" top={0} bg={bgColor} zIndex={1}>
                        <Tr>
                          <Th>Tên</Th>
                          <Th>Khóa</Th>
                          <Th>MSSV</Th>
                          <Th>Phần tham gia</Th>
                          <Th>Trạng thái</Th>
                          <Th>Chọn</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {filteredMembers.map((member) => (
                          <Tr key={member.id} _hover={{ bg: 'orange.50' }}>
                            <Td fontWeight="medium">{member.name}</Td>
                            <Td>
                              <Badge colorScheme="teal" variant="subtle">
                                {member.khoa || 'N/A'}
                              </Badge>
                            </Td>
                            <Td>{member.MSSV || '-'}</Td>
                            <Td>
                              <Badge 
                                colorScheme={member.participation_type === 'Cả hai' ? 'green' : 
                                            member.participation_type === 'Phần lễ' ? 'orange' : 
                                            member.participation_type === 'Phần hội' ? 'pink' : 'gray'}
                                variant="subtle"
                              >
                                {member.participation_type || '-'}
                              </Badge>
                            </Td>
                            <Td>
                              <Badge 
                                colorScheme={member.state === 'Đã checkin' ? 'green' : 'orange'}
                                variant="solid"
                              >
                                {member.state || 'Chưa checkin'}
                              </Badge>
                            </Td>
                            <Td>
                              <Button
                                size="sm"
                                colorScheme="orange"
                                variant="outline"
                                onClick={() => handleMemberSelect(member)}
                                isDisabled={member.checkin_ceremony && member.checkin_party}
                              >
                                Chọn
                              </Button>
                            </Td>
                          </Tr>
                        ))}
                        {filteredMembers.length === 0 && (
                          <Tr>
                            <Td colSpan={6} textAlign="center" py={8}>
                              <Text color="gray.500">
                                {searchTerm ? 'Không tìm thấy thành viên nào' : 'Không có dữ liệu'}
                              </Text>
                            </Td>
                          </Tr>
                        )}
                      </Tbody>
                    </Table>
                  </TableContainer>
                )}
              </Box>

              <Divider />

              {/* Check-in Form */}
              <Box>
                <Text fontSize="lg" fontWeight="bold" mb={3}>
                  ✅ Thông tin check-in
                </Text>
                <Flex direction="column" gap={4}>
                  <FormControl>
                    <FormLabel>MSSV hoặc Tên</FormLabel>
                    <Input 
                      placeholder='Nhập MSSV hoặc tên đầy đủ'
                      value={uid}
                      onChange={(e) => setUid(e.target.value)}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Loại check-in</FormLabel>
                    <HStack spacing={4}>
                      <Button
                        size="sm"
                        colorScheme={checkinType === 'both' ? 'green' : 'gray'}
                        variant={checkinType === 'both' ? 'solid' : 'outline'}
                        onClick={() => setCheckinType('both')}
                      >
                        Cả hai
                      </Button>
                      <Button
                        size="sm"
                        colorScheme={checkinType === 'ceremony' ? 'orange' : 'gray'}
                        variant={checkinType === 'ceremony' ? 'solid' : 'outline'}
                        onClick={() => setCheckinType('ceremony')}
                      >
                        📜 Phần Lễ
                      </Button>
                      <Button
                        size="sm"
                        colorScheme={checkinType === 'party' ? 'pink' : 'gray'}
                        variant={checkinType === 'party' ? 'solid' : 'outline'}
                        onClick={() => setCheckinType('party')}
                      >
                        🎉 Phần Hội
                      </Button>
                    </HStack>
                  </FormControl>
                </Flex>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button 
              colorScheme="orange" 
              mr={3} 
              onClick={handleCheckin} 
              isLoading={loading}
              loadingText="Đang check-in..."
              size="lg"
            >
              ✓ Check-in
            </Button>
            <Button variant="ghost" onClick={onClose} isDisabled={loading}>Hủy</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default Checkin;