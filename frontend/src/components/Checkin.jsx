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
  useToast
} from '@chakra-ui/react';
import { AiOutlineCheckCircle } from "react-icons/ai";
import { BASE_URL } from '../config';
const Checkin = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [uid, setUid] = useState('');
  const toast = useToast();

  const handleCheckin = async () => {
    try {
      const response = await fetch(BASE_URL + '/checkin/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uid })
      });
      const data = await response.json();
      
      if (response.ok) {
        const {name,checkin_time,speciality} = data.member;
        const date = new Date(checkin_time);
        const formattedTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')} ${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        toast({
          title: `${name} check-in thành công`,
          description: `Thành viên ${name} mảng ${speciality} đã check-in vào lúc ${formattedTime}`,
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        onClose();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: "Check-in failed",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
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
            <Button colorScheme="blue" mr={3} onClick={handleCheckin}>
              Check-in
            </Button>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default Checkin;