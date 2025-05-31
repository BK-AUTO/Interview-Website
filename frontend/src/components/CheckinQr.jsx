import React, { useState, useEffect, useRef } from 'react';
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
  Container,
  Box,
  Text
} from '@chakra-ui/react';
import { IoMdQrScanner } from "react-icons/io";
import QrScanner from 'qr-scanner';
import { BASE_URL} from '../config';

const Checkin = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [uid, setUid] = useState('');
  const [scannedData, setScannedData] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    if (isOpen && videoRef.current) {
      const qrScanner = new QrScanner(
        videoRef.current,
        result => setScannedData(result.data), // Extract the data property
        {
          onDecodeError: error => console.error(error),
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );
      qrScannerRef.current = qrScanner;

      // Start the QR scanner
      qrScanner.start().catch(error => {
        console.error('Error starting QR scanner:', error);
        toast({
          title: "Camera Error",
          description: "Unable to access the camera. Please check your camera permissions.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      });

      return () => {
        qrScanner.stop();
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (scannedData) {
      setUid(scannedData);
    }
  }, [scannedData]);

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
        const { name, checkin_time, speciality } = data.member;
        const date = new Date(checkin_time);
        const formattedTime = date.toLocaleString('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
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

  const toggleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <>
      <Button onClick={onOpen}>
        <IoMdQrScanner size={20} />
      </Button>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Check-in Page</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Flex alignItems={"center"} justifyContent={"center"} direction="column">
              <FormControl>
                <FormLabel>UID</FormLabel>
                <Input 
                  placeholder='Nhập UID được gửi trong mail của bạn'
                  value={uid}
                  onChange={(e) => setUid(e.target.value)}
                />
              </FormControl>
              <Container maxW="md" centerContent mt={4}>
                <Box p={4} borderWidth={1} borderRadius="lg" boxShadow="lg" w="100%">
                  <Text fontSize="xl" mb={4}>Scan QR Code</Text>
                  <video
                    ref={videoRef}
                    style={{
                      width: '100%',
                      transform: isFlipped ? 'scaleX(-1)' : 'none'
                    }}
                    playsInline
                  />
                  <Button mt={4} onClick={toggleFlip}>
                    {isFlipped ? 'Unflip Video' : 'Flip Video'}
                  </Button>
                </Box>
              </Container>
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