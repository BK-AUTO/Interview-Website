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
  useDisclosure,
  FormControl,
  FormLabel,
  Flex,
  Input,
  useToast,
  Spinner
} from '@chakra-ui/react';
import { AiOutlineCheckCircle } from "react-icons/ai";
import api from '../api/axios';

const Checkin = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [uid, setUid] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleCheckin = async () => {
    if (!uid.trim()) {
      toast({
        title: "UID is required",
        description: "Please enter your UID before checking in",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/checkin', { uid });
      
      if (response.data && response.data.member) {
        const { name, specialist, checkin_time } = response.data.member;
        
        // Display the time as received from backend (already in GMT+7)
        const displayTime = checkin_time || 'N/A';
        
        toast({
          title: `${name} check-in thành công`,
          description: `Thành viên ${name} mảng ${specialist || 'chưa xác định'} đã check-in vào lúc ${displayTime}`,
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
      
      // Handle specific error for interview in progress
      if (errorResponse.message && errorResponse.message.includes("interview")) {
        toast({
          title: "Check-in failed",
          description: "Member is currently in an interview and cannot check in",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } else {
        const errorMessage = errorResponse.message || errorResponse.error || 'Unable to check-in. Please try again.';
        toast({
          title: "Check-in failed",
          description: errorMessage,
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={onOpen}>
        <AiOutlineCheckCircle size={20} />
      </Button>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Check-in</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Flex alignItems={"center"} justifyContent={"center"}>
              <FormControl>
                <FormLabel>MSSV</FormLabel>
                <Input 
                  placeholder='Nhập MSSV của bạn'
                  value={uid}
                  onChange={(e) => setUid(e.target.value)}
                />
              </FormControl>
            </Flex>
          </ModalBody>
          <ModalFooter>
            <Button 
              colorScheme="blue" 
              mr={3} 
              onClick={handleCheckin} 
              isLoading={loading}
              loadingText="Đang checkin..."
            >
              Check-in
            </Button>
            <Button variant="ghost" onClick={onClose} isDisabled={loading}>Hủy</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default Checkin;