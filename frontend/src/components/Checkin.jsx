import React, { useState } from 'react';
import {
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  useToast,
  VStack,
  HStack,
  Text,
  Box,
} from '@chakra-ui/react';
import { FaCheckCircle } from 'react-icons/fa';
import api from '../api/axios';

const Checkin = ({ isOpen, onClose }) => {
  const [uid, setUid] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleCheckin = async () => {
    if (!uid.trim()) {
      toast({
        title: "Chưa nhập MSSV",
        description: "Vui lòng nhập mã số sinh viên của bạn để check-in",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/checkin', { uid: uid.trim() });

      if (response.data && response.data.member) {
        const { name, specialist, checkin_time } = response.data.member;
        const displayTime = checkin_time || 'N/A';

        toast({
          title: "Check-in thành công!",
          description: `Ứng viên ${name} (${specialist || 'Chưa phân mảng'}) đã check-in lúc ${displayTime}`,
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        setUid('');
        onClose();
      }
    } catch (error) {
      console.error('Check-in error:', error);
      const errorResponse = error.response?.data || {};
      const errorMessage = errorResponse.message || errorResponse.error || 'Không thể check-in. Vui lòng thử lại.';

      toast({
        title: "Check-in thất bại",
        description: errorMessage,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
      <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(4px)" />
      <ModalContent bg="white" borderColor="gray.200" borderWidth="1px" borderRadius="xl">
        <ModalHeader borderBottomWidth="1px" borderColor="gray.200" py={4}>
          <HStack spacing={3}>
            <Box p={2} borderRadius="lg" bg="rgba(58, 197, 105, 0.12)" color="primary.500">
              <FaCheckCircle size={18} />
            </Box>
            <Box>
              <Text fontSize="md" fontWeight="bold" color="gray.900">
                Check-in Ứng viên
              </Text>
              <Text fontSize="xs" fontWeight="normal" color="gray.500">
                Nhập MSSV để ghi nhận ứng viên đã có mặt
              </Text>
            </Box>
          </HStack>
        </ModalHeader>
        <ModalCloseButton color="gray.500" />

        <ModalBody py={6}>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                Mã số sinh viên (MSSV)
              </FormLabel>
              <Input
                placeholder="VD: 20210001"
                value={uid}
                onChange={(e) => setUid(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCheckin()}
                size="lg"
                autoFocus
                fontSize="md"
              />
            </FormControl>
            <Text fontSize="xs" color="gray.400">
              * Chỉ những ứng viên đã xác nhận tham gia phỏng vấn mới đủ điều kiện check-in.
            </Text>
          </VStack>
        </ModalBody>

        <ModalFooter borderTopWidth="1px" borderColor="gray.200">
          <Button variant="ghost" mr={3} onClick={onClose} isDisabled={loading} color="gray.600">
            Hủy
          </Button>
          <Button
            colorScheme="primary"
            onClick={handleCheckin}
            isLoading={loading}
            loadingText="Đang ghi nhận..."
          >
            Xác nhận Check-in
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default Checkin;
