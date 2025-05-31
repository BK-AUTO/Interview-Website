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
  const [lotteryNumber, setLotteryNumber] = useState('');
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
        member.organization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.former_role?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredMembers(filtered);
    }
  }, [searchTerm, members]);

  const handleMemberSelect = (member) => {
    setUid(member.MSSV || member.name);
  };

  const handleCheckin = async () => {
    if (!uid.trim()) {
      toast({
        title: "ID is required",
        description: "Please enter your MSSV or Name before checking in",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!lotteryNumber.trim()) {
      toast({
        title: "Lottery number is required",
        description: "Please enter your lottery number before checking in",
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
        lottery_number: parseInt(lotteryNumber.trim()) 
      });
      
      if (response.data && response.data.member) {
        const { name, khoa, organization, join_year, former_role, lottery_number, checkin_time } = response.data.member;
        
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
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
              });
            }
          }
        } catch (e) {
          console.error('Error formatting date:', e);
        }
        
        toast({
          title: `${name} check-in thành công`,
          description: `Thành viên ${name} từ ${organization || khoa || 'chưa xác định'} đã check-in vào lúc ${formattedTime} với số bốc thăm ${lottery_number}`,
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        setUid('');
        setLotteryNumber('');
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
          <ModalHeader>Check-in Page</ModalHeader>
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
                    <SearchIcon color="gray.300" />
                  </InputLeftElement>
                  <Input
                    placeholder="Tìm theo tên, MSSV, tổ chức hoặc vai trò..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
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
                          <Th>MSSV</Th>
                          <Th>Tổ chức</Th>
                          <Th>Vai trò cũ</Th>
                          <Th>Trạng thái</Th>
                          <Th>Chọn</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {filteredMembers.map((member) => (
                          <Tr key={member.id} _hover={{ bg: 'gray.50' }}>
                            <Td fontWeight="medium">{member.name}</Td>
                            <Td>{member.MSSV}</Td>
                            <Td>{member.organization || 'N/A'}</Td>
                            <Td>{member.former_role || 'N/A'}</Td>
                            <Td>
                              <Badge 
                                colorScheme={member.state === 'Đã checkin' ? 'green' : 'orange'}
                                variant="subtle"
                              >
                                {member.state || 'Chưa checkin'}
                              </Badge>
                            </Td>
                            <Td>
                              <Button
                                size="sm"
                                colorScheme="blue"
                                variant="outline"
                                onClick={() => handleMemberSelect(member)}
                                isDisabled={member.state === 'Đã checkin'}
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
                      placeholder='Nhập MSSV hoặc tên đầy đủ của bạn'
                      value={uid}
                      onChange={(e) => setUid(e.target.value)}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Số bốc thăm</FormLabel>
                    <Input 
                      placeholder='Nhập số bốc thăm của bạn'
                      type="number"
                      value={lotteryNumber}
                      onChange={(e) => setLotteryNumber(e.target.value)}
                    />
                  </FormControl>
                </Flex>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button 
              colorScheme="blue" 
              mr={3} 
              onClick={handleCheckin} 
              isLoading={loading}
              loadingText="Checking in..."
            >
              Check-in
            </Button>
            <Button variant="ghost" onClick={onClose} isDisabled={loading}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default Checkin;