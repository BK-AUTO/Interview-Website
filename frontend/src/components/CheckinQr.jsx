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
  FormControl,
  FormLabel,
  Input,
  useToast,
  VStack,
  HStack,
  Text,
  Box,
} from '@chakra-ui/react';
import { FaQrcode, FaCamera } from 'react-icons/fa';
import QrScanner from 'qr-scanner';
import api from '../api/axios';

const CheckinQr = ({ isOpen, onClose }) => {
  const [uid, setUid] = useState('');
  const [scannedData, setScannedData] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    if (isOpen && videoRef.current) {
      const qrScanner = new QrScanner(
        videoRef.current,
        result => setScannedData(result.data),
        {
          onDecodeError: error => console.error(error),
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );
      qrScannerRef.current = qrScanner;

      qrScanner.start().catch(error => {
        console.error('Error starting QR scanner:', error);
        toast({
          title: "Không mở được Camera",
          description: "Vui lòng cấp quyền truy cập camera trên trình duyệt của bạn.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      });

      return () => {
        qrScanner.stop();
      };
    }
  }, [isOpen, toast]);

  useEffect(() => {
    if (scannedData) {
      setUid(scannedData);
    }
  }, [scannedData]);

  const handleCheckin = async () => {
    if (!uid.trim()) {
      toast({
        title: "Chưa có mã",
        description: "Vui lòng quét mã QR hoặc nhập MSSV/UID trước khi xác nhận",
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
        const { name, checkin_time, specialist } = response.data.member;
        const displayTime = checkin_time || 'N/A';
        toast({
          title: "Check-in thành công!",
          description: `Ứng viên ${name} (${specialist || 'Chưa phân mảng'}) đã check-in lúc ${displayTime}`,
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        setUid('');
        setScannedData('');
        onClose();
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Check-in thất bại';
      toast({
        title: "Check-in thất bại",
        description: errorMsg,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="lg">
      <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(4px)" />
      <ModalContent bg="white" borderColor="gray.200" borderWidth="1px" borderRadius="xl">
        <ModalHeader borderBottomWidth="1px" borderColor="gray.200" py={4}>
          <HStack spacing={3}>
            <Box p={2} borderRadius="lg" bg="rgba(24, 144, 255, 0.12)" color="info.500">
              <FaQrcode size={18} />
            </Box>
            <Box>
              <Text fontSize="md" fontWeight="bold" color="gray.900">
                Quét mã QR Check-in
              </Text>
              <Text fontSize="xs" fontWeight="normal" color="gray.500">
                Đưa mã QR trước camera hoặc nhập MSSV/UID bên dưới
              </Text>
            </Box>
          </HStack>
        </ModalHeader>
        <ModalCloseButton color="gray.500" />

        <ModalBody py={5}>
          <VStack spacing={4} align="stretch">
            {/* Video container — kept dark like a camera viewfinder */}
            <Box
              p={2}
              borderWidth="1px"
              borderColor="dark.border"
              borderRadius="lg"
              bg="dark.900"
              position="relative"
              overflow="hidden"
            >
              <video
                ref={videoRef}
                style={{
                  width: '100%',
                  height: '240px',
                  objectFit: 'cover',
                  borderRadius: '6px',
                  transform: isFlipped ? 'scaleX(-1)' : 'none',
                }}
                playsInline
              />
              <Button
                size="xs"
                position="absolute"
                bottom={3}
                right={3}
                variant="solid"
                bg="dark.800"
                borderColor="dark.border"
                borderWidth="1px"
                leftIcon={<FaCamera />}
                onClick={toggleFlip}
                color="whiteAlpha.800"
              >
                Lật Camera
              </Button>
            </Box>

            <FormControl>
              <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                Mã đã quét / MSSV
              </FormLabel>
              <Input
                placeholder="Dữ liệu từ mã QR hoặc nhập tay MSSV"
                value={uid}
                onChange={(e) => setUid(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCheckin()}
              />
            </FormControl>
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
            loadingText="Đang check-in..."
          >
            Xác nhận Check-in
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CheckinQr;
