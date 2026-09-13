import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Select,
  IconButton,
  Tooltip,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
} from '@chakra-ui/react';
import {
  FaQrcode,
  FaCamera,
  FaSyncAlt,
  FaBolt,
  FaUpload,
  FaVideoSlash,
} from 'react-icons/fa';
import QrScanner from 'qr-scanner';
import api from '../api/axios';

const CheckinQr = ({ isOpen, onClose, setMembers }) => {
  const [uid, setUid] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [hasFlash, setHasFlash] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [videoEl, setVideoEl] = useState(null);

  const qrScannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const toast = useToast();

  const isSecureContext =
    typeof window !== 'undefined' &&
    (window.isSecureContext ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1');

  // Callback ref for video element to ensure we detect when it mounts in DOM
  const videoRefCallback = useCallback((node) => {
    setVideoEl(node);
  }, []);

  // Clean up scanner and camera tracks
  const cleanupScanner = useCallback(() => {
    if (qrScannerRef.current) {
      try {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
      } catch (e) {
        console.warn('Error during scanner cleanup:', e);
      }
      qrScannerRef.current = null;
    }
  }, []);

  // Initialize camera & QR scanner
  const startScanner = useCallback(
    async (targetVideoEl, cameraId = null) => {
      if (!targetVideoEl) return;

      cleanupScanner();
      setCameraLoading(true);
      setCameraError(null);

      // Check browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          !isSecureContext
            ? 'Trình duyệt yêu cầu kết nối HTTPS để mở Camera. Hãy truy cập qua HTTPS hoặc sử dụng tính năng "Tải ảnh mã QR" bên dưới.'
            : 'Trình duyệt của bạn không hỗ trợ truy cập Camera.'
        );
        setCameraLoading(false);
        return;
      }

      try {
        // Enumerate available camera devices
        try {
          const availableCameras = await QrScanner.listCameras(true);
          setCameras(availableCameras);
          if (availableCameras.length > 0 && !cameraId) {
            // Default to environment (back) camera if available, else first camera
            const backCam = availableCameras.find(
              (c) =>
                c.label.toLowerCase().includes('back') ||
                c.label.toLowerCase().includes('rear') ||
                c.label.toLowerCase().includes('environment')
            );
            cameraId = backCam ? backCam.id : availableCameras[0].id;
            setSelectedCameraId(cameraId);
          }
        } catch (e) {
          console.warn('Could not enumerate cameras:', e);
        }

        const scanner = new QrScanner(
          targetVideoEl,
          (result) => {
            const scanned = typeof result === 'object' && result.data ? result.data : String(result);
            if (scanned) {
              setUid(scanned.trim());
              toast({
                title: 'Đã nhận diện mã QR!',
                description: `Mã: ${scanned.trim()}`,
                status: 'info',
                duration: 2000,
                isClosable: true,
              });
            }
          },
          {
            onDecodeError: () => {},
            highlightScanRegion: true,
            highlightCodeOutline: true,
            preferredCamera: cameraId || 'environment',
            maxScansPerSecond: 8,
          }
        );

        qrScannerRef.current = scanner;
        await scanner.start();

        // Check flash support
        try {
          const flashAvailable = await scanner.hasFlash();
          setHasFlash(flashAvailable);
        } catch {
          setHasFlash(false);
        }

        setCameraLoading(false);
      } catch (err) {
        console.error('Error starting QR scanner:', err);
        let message = 'Không thể mở Camera.';
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          message = 'Quyền truy cập Camera bị từ chối. Vui lòng cho phép quyền Camera trên trình duyệt.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          message = 'Không tìm thấy thiết bị Camera trên máy này.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          message = 'Camera đang bị ứng dụng khác sử dụng hoặc bị khóa bởi hệ thống.';
        } else if (err.name === 'OverconstrainedError') {
          message = 'Không thể áp dụng cấu hình Camera được yêu cầu.';
        } else if (err.message) {
          message = `Lỗi Camera: ${err.message}`;
        }
        setCameraError(message);
        setCameraLoading(false);
      }
    },
    [cleanupScanner, isSecureContext, toast]
  );

  // Trigger camera start when Modal opens and video element is mounted
  useEffect(() => {
    if (isOpen && videoEl) {
      startScanner(videoEl, selectedCameraId);
    }

    return () => {
      cleanupScanner();
    };
  }, [isOpen, videoEl, startScanner, cleanupScanner]);

  // Handle camera switch
  const handleCameraChange = async (e) => {
    const newCameraId = e.target.value;
    setSelectedCameraId(newCameraId);
    if (videoEl) {
      await startScanner(videoEl, newCameraId);
    }
  };

  // Toggle flashlight
  const handleToggleFlash = async () => {
    if (!qrScannerRef.current) return;
    try {
      await qrScannerRef.current.toggleFlash();
      setIsFlashOn(qrScannerRef.current.isFlashOn());
    } catch (err) {
      console.warn('Flashlight toggle failed:', err);
    }
  };

  // Scan QR from image file
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await QrScanner.scanImage(file, {
        alsoTryWithoutScanRegion: true,
        returnDetailedScanResult: true,
      });

      const text = result?.data || (typeof result === 'string' ? result : '');
      if (text) {
        setUid(text.trim());
        toast({
          title: 'Quét ảnh thành công!',
          description: `Mã nhận diện: ${text.trim()}`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('QR scan from image error:', error);
      toast({
        title: 'Không tìm thấy mã QR trong ảnh',
        description: 'Vui lòng chọn ảnh có mã QR rõ nét hơn hoặc nhập MSSV bên dưới.',
        status: 'warning',
        duration: 3500,
        isClosable: true,
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCheckin = async () => {
    if (!uid.trim()) {
      toast({
        title: 'Chưa có mã',
        description: 'Vui lòng quét mã QR hoặc nhập MSSV/UID trước khi xác nhận',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/checkin', { uid: uid.trim() });
      if (response.data && response.data.member) {
        const checkedMember = response.data.member;
        const { name, checkin_time, specialist } = checkedMember;
        const displayTime = checkin_time || 'N/A';

        // Immediately sync local state
        if (setMembers) {
          setMembers((prev) => prev.map((m) => (m.id === checkedMember.id ? checkedMember : m)));
        }

        toast({
          title: 'Check-in thành công!',
          description: `Ứng viên ${name} (${specialist || 'Chưa phân mảng'}) đã check-in lúc ${displayTime}`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        setUid('');
        cleanupScanner();
        onClose();
      }
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Check-in thất bại';
      toast({
        title: 'Check-in thất bại',
        description: errorMsg,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    cleanupScanner();
    setUid('');
    setCameraError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      isCentered
      size="lg"
      unmountOnClose={false}
      returnFocusOnClose={false}
    >
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
                Đưa mã QR trước camera hoặc tải ảnh / nhập MSSV bên dưới
              </Text>
            </Box>
          </HStack>
        </ModalHeader>
        <ModalCloseButton color="gray.500" />

        <ModalBody py={5}>
          <VStack spacing={4} align="stretch">
            {/* Camera Viewfinder Box */}
            <Box
              p={2}
              borderWidth="1px"
              borderColor="gray.700"
              borderRadius="xl"
              bg="gray.950"
              position="relative"
              overflow="hidden"
              minH="260px"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              {/* Video Element */}
              <video
                ref={videoRefCallback}
                style={{
                  width: '100%',
                  height: '240px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  transform: isFlipped ? 'scaleX(-1)' : 'none',
                  display: cameraError ? 'none' : 'block',
                }}
                playsInline
                muted
              />

              {/* Loading Spinner */}
              {cameraLoading && !cameraError && (
                <VStack
                  position="absolute"
                  inset="0"
                  bg="blackAlpha.700"
                  align="center"
                  justify="center"
                  zIndex={2}
                  spacing={2}
                >
                  <Spinner size="lg" color="primary.400" thickness="3px" />
                  <Text fontSize="xs" color="whiteAlpha.800">
                    Đang kết nối Camera...
                  </Text>
                </VStack>
              )}

              {/* Camera Error / Warning View */}
              {cameraError && (
                <VStack p={4} textAlign="center" spacing={3} color="whiteAlpha.900">
                  <Box p={3} borderRadius="full" bg="whiteAlpha.100" color="red.400">
                    <FaVideoSlash size={28} />
                  </Box>
                  <Text fontSize="sm" fontWeight="medium" color="red.300">
                    {cameraError}
                  </Text>
                  <HStack spacing={2}>
                    <Button
                      size="sm"
                      leftIcon={<FaSyncAlt />}
                      colorScheme="blue"
                      variant="outline"
                      onClick={() => videoEl && startScanner(videoEl, selectedCameraId)}
                    >
                      Thử lại
                    </Button>
                    <Button
                      size="sm"
                      leftIcon={<FaUpload />}
                      colorScheme="teal"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Tải ảnh QR
                    </Button>
                  </HStack>
                </VStack>
              )}

              {/* Camera Overlay Controls (Flip / Flash) */}
              {!cameraError && (
                <HStack position="absolute" bottom={3} right={3} spacing={2} zIndex={3}>
                  {hasFlash && (
                    <Tooltip label={isFlashOn ? 'Tắt đèn Flash' : 'Bật đèn Flash'} hasArrow>
                      <IconButton
                        size="xs"
                        aria-label="Flash"
                        icon={<FaBolt />}
                        colorScheme={isFlashOn ? 'yellow' : 'gray'}
                        variant="solid"
                        onClick={handleToggleFlash}
                      />
                    </Tooltip>
                  )}
                  <Tooltip label="Lật gương Camera" hasArrow>
                    <IconButton
                      size="xs"
                      aria-label="Flip"
                      icon={<FaCamera />}
                      bg="blackAlpha.700"
                      color="white"
                      _hover={{ bg: 'blackAlpha.900' }}
                      onClick={() => setIsFlipped((prev) => !prev)}
                    />
                  </Tooltip>
                </HStack>
              )}
            </Box>

            {/* Camera Selector & Upload Button */}
            <HStack spacing={2} justify="space-between">
              {cameras.length > 1 ? (
                <Select
                  size="xs"
                  borderRadius="md"
                  value={selectedCameraId}
                  onChange={handleCameraChange}
                  maxW="200px"
                >
                  {cameras.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label || `Camera ${c.id.substring(0, 5)}...`}
                    </option>
                  ))}
                </Select>
              ) : (
                <Box />
              )}

              {/* Hidden File Input for QR Image */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              <Button
                size="xs"
                variant="ghost"
                colorScheme="primary"
                leftIcon={<FaUpload />}
                onClick={() => fileInputRef.current?.click()}
              >
                Tải ảnh mã QR từ máy
              </Button>
            </HStack>

            {!isSecureContext && (
              <Alert status="warning" borderRadius="md" py={2} px={3} fontSize="xs">
                <AlertIcon boxSize="14px" />
                <Box>
                  <AlertTitle fontSize="xs">Không phải kết nối HTTPS:</AlertTitle>
                  <AlertDescription fontSize="xs">
                    Trình duyệt có thể chặn Camera trên HTTP IP. Hãy dùng tính năng tải ảnh QR hoặc nhập MSSV bên dưới.
                  </AlertDescription>
                </Box>
              </Alert>
            )}

            {/* Input Form for MSSV / Scanned Data */}
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                Mã đã quét / MSSV ứng viên
              </FormLabel>
              <Input
                placeholder="Dữ liệu từ mã QR hoặc nhập tay MSSV"
                value={uid}
                onChange={(e) => setUid(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCheckin()}
                autoFocus
              />
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter borderTopWidth="1px" borderColor="gray.200">
          <Button variant="ghost" mr={3} onClick={handleModalClose} isDisabled={loading} color="gray.600">
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

