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
        
        // Format the date for display
        let formattedTime = checkin_time || new Date().toLocaleString();
        try {
          if (checkin_time) {
            const date = new Date(checkin_time);
            if (!isNaN(date.getTime())) {
              formattedTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')} ${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
            }
          }
        } catch (e) {
          console.error('Error formatting date:', e);
        }
        
        toast({
          title: `${name} check-in thành công`,
          description: `Thành viên ${name} mảng ${specialist || 'chưa xác định'} đã check-in vào lúc ${formattedTime}`,
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        setUid('');
        onClose();
      }
    } catch (error) {
      console.error('Check-in error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Unable to check-in. Please try again.';
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

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Check-in Page</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Flex alignItems={"center"} justifyContent={"center"}>
              <FormControl>
                <FormLabel>UID</FormLabel>
                <Input 
                  placeholder='Nhập UID được gửi trong mail của bạn'
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