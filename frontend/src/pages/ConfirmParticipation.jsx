import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Button,
  Center,
  Heading,
  Image,
  Input,
  Spinner,
  Text,
  Textarea,
  VStack,
  HStack,
  Badge,
  FormControl,
  FormLabel,
  SimpleGrid,
  Divider,
  useToast,
} from '@chakra-ui/react';
import {
  FaCheckCircle,
  FaCalendarAlt,
  FaClock,
  FaKey,
  FaExclamationCircle,
  FaCheck,
  FaHistory,
  FaUserGraduate,
  FaArrowLeft,
} from 'react-icons/fa';
import { BASE_URL, DEPARTMENT_LABELS } from '../config';

// Standalone axios instance for public candidate confirmation
const api = axios.create({ baseURL: BASE_URL });

const CardShell = ({ children }) => (
  <Center minH="100vh" bg="#f8fafc" px={4} py={{ base: 6, md: 10 }}>
    <Box
      maxW="480px"
      w="full"
      bg="white"
      borderRadius="2xl"
      borderWidth="1px"
      borderColor="gray.200"
      boxShadow="0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02)"
      p={{ base: 6, sm: 8 }}
    >
      {/* Brand Header */}
      <VStack spacing={2} mb={6} textAlign="center">
        <Image
          src="/logobkauto.png"
          alt="BK-AUTO Logo"
          height="52px"
          objectFit="contain"
          mx="auto"
          fallback={
            <Box
              px={3}
              py={1.5}
              borderRadius="lg"
              bg="rgba(58, 197, 105, 0.12)"
              color="primary.600"
              fontWeight="extrabold"
              fontSize="lg"
            >
              BK-AUTO
            </Box>
          }
        />
        <Text
          fontSize="10px"
          fontWeight="bold"
          letterSpacing="0.12em"
          textTransform="uppercase"
          color="gray.400"
        >
          Câu Lạc Bộ BK-AUTO • Tuyển Thành Viên
        </Text>
      </VStack>
      <Divider borderColor="gray.100" mb={6} />
      {children}
    </Box>
  </Center>
);

const ConfirmParticipation = () => {
  const { token } = useParams();
  const toast = useToast();

  const [phase, setPhase] = useState('checking'); // checking | invalid | password | verified
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [summary, setSummary] = useState(null);
  const [showReschedule, setShowReschedule] = useState(false);

  // Reschedule form state
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    api
      .get(`/api/confirm/${token}`)
      .then(() => setPhase('password'))
      .catch(() => setPhase('invalid'));
  }, [token]);

  const handleVerify = async () => {
    if (!password.trim()) {
      toast({
        title: 'Vui lòng nhập mật khẩu',
        status: 'warning',
        duration: 2500,
        isClosable: true,
      });
      return;
    }

    setVerifying(true);
    try {
      const response = await api.post(`/api/confirm/${token}/verify`, { password });
      setSummary(response.data);
      setPhase('verified');
    } catch (error) {
      toast({
        title: error.response?.data?.message || 'Mật khẩu xác thực không đúng',
        description: 'Vui lòng kiểm tra lại mật khẩu 6 số đã được gửi cho bạn.',
        status: 'error',
        duration: 3500,
        isClosable: true,
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleConfirm = async () => {
    setActionLoading(true);
    try {
      const response = await api.post(`/api/confirm/${token}/confirm`, { password });
      setSummary(response.data);
      toast({
        title: 'Xác nhận thành công!',
        description: 'Bạn đã xác nhận tham gia buổi phỏng vấn.',
        status: 'success',
        duration: 4000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: error.response?.data?.message || 'Có lỗi xảy ra khi xác nhận',
        status: 'error',
        duration: 3500,
        isClosable: true,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!preferredDate && !preferredTime && !reason.trim()) {
      toast({
        title: 'Vui lòng cung cấp thông tin đổi lịch',
        description: 'Vui lòng chọn ngày, giờ hoặc nhập lý do mong muốn đổi lịch.',
        status: 'warning',
        duration: 3500,
        isClosable: true,
      });
      return;
    }

    // Build structured reason string
    const timeElements = [];
    if (preferredTime) timeElements.push(`Giờ: ${preferredTime}`);
    if (preferredDate) timeElements.push(`Ngày: ${preferredDate}`);

    let formattedReason = '';
    if (timeElements.length > 0) {
      formattedReason = `[Đề xuất: ${timeElements.join(', ')}] ${reason.trim()}`.trim();
    } else {
      formattedReason = reason.trim();
    }

    setActionLoading(true);
    try {
      const response = await api.post(`/api/confirm/${token}/reschedule`, {
        password,
        reason: formattedReason,
      });
      setSummary(response.data);
      setShowReschedule(false);
      toast({
        title: 'Đã gửi yêu cầu đổi lịch thành công!',
        description: 'Ban Quản Lý sẽ sớm liên hệ lại với bạn.',
        status: 'success',
        duration: 4000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: error.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu',
        status: 'error',
        duration: 3500,
        isClosable: true,
      });
    } finally {
      setActionLoading(false);
    }
  };

  // 1. Loading Phase
  if (phase === 'checking') {
    return (
      <CardShell>
        <VStack spacing={4} py={8}>
          <Spinner size="xl" thickness="3px" color="primary.500" speed="0.7s" />
          <Text fontSize="sm" color="gray.500" fontWeight="medium">
            Đang kiểm tra liên kết xác nhận...
          </Text>
        </VStack>
      </CardShell>
    );
  }

  // 2. Invalid Link Phase
  if (phase === 'invalid') {
    return (
      <CardShell>
        <VStack spacing={4} textAlign="center" py={4}>
          <Box p={3} borderRadius="full" bg="red.50" color="red.500">
            <FaExclamationCircle size={32} />
          </Box>
          <Heading size="md" color="gray.900" fontWeight="bold">
            Liên kết không hợp lệ
          </Heading>
          <Text color="gray.600" fontSize="sm" lineHeight="tall">
            Liên kết này không tồn tại hoặc đã hết hạn xác nhận. Vui lòng liên hệ trực tiếp Ban Quản Lý CLB BK-AUTO qua Fanpage hoặc Email để được hỗ trợ.
          </Text>
        </VStack>
      </CardShell>
    );
  }

  // 3. Password Phase
  if (phase === 'password') {
    return (
      <CardShell>
        <VStack spacing={5} align="stretch">
          <VStack spacing={2} textAlign="center">
            <Box p={3} borderRadius="full" bg="rgba(58, 197, 105, 0.12)" color="primary.600">
              <FaKey size={24} />
            </Box>
            <Heading size="md" color="gray.900" fontWeight="bold">
              Xác thực tham gia phỏng vấn
            </Heading>
            <Text color="gray.500" fontSize="xs">
              Nhập mật khẩu 6 số được gửi qua tin nhắn / email của bạn để tiếp tục
            </Text>
          </VStack>

          <FormControl>
            <Input
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              textAlign="center"
              fontSize="2xl"
              fontWeight="bold"
              letterSpacing="6px"
              maxLength={6}
              bg="gray.50"
              borderColor="gray.200"
              borderRadius="xl"
              h="54px"
              _focus={{
                bg: 'white',
                borderColor: 'primary.500',
                boxShadow: '0 0 0 1px #3ac569',
              }}
              autoFocus
            />
          </FormControl>

          <Button
            colorScheme="primary"
            size="lg"
            borderRadius="xl"
            w="full"
            onClick={handleVerify}
            isLoading={verifying}
            loadingText="Đang xác thực..."
          >
            Tiếp tục
          </Button>
        </VStack>
      </CardShell>
    );
  }

  // 4. Verified Phase
  const {
    name,
    specialist,
    state,
    reschedule_request: reschedule,
    interview_info: interviewInfo,
  } = summary || {};

  return (
    <CardShell>
      <VStack spacing={5} align="stretch">
        {/* Candidate Welcome Profile */}
        <VStack spacing={2} textAlign="center">
          <Box
            p={3}
            borderRadius="full"
            bg="rgba(58, 197, 105, 0.12)"
            color="primary.600"
            display="inline-flex"
          >
            <FaUserGraduate size={24} />
          </Box>
          <Heading size="md" color="gray.900" fontWeight="bold">
            Xin chào, {name}!
          </Heading>
          <HStack spacing={2} justify="center" flexWrap="wrap">
            <Badge
              colorScheme="primary"
              variant="subtle"
              px={2.5}
              py={0.5}
              borderRadius="full"
              fontSize="xs"
              fontWeight="semibold"
            >
              Mảng: {DEPARTMENT_LABELS[specialist] || specialist || 'Chung'}
            </Badge>
            <Badge
              colorScheme={
                state === 'Đã xác nhận'
                  ? 'green'
                  : state === 'Xin đổi lịch'
                  ? 'orange'
                  : 'blue'
              }
              variant="outline"
              px={2.5}
              py={0.5}
              borderRadius="full"
              fontSize="xs"
              fontWeight="semibold"
            >
              {state}
            </Badge>
          </HStack>
        </VStack>

        {/* Scheduled Interview Info Box */}
        {interviewInfo && (
          <Box
            p={4}
            borderRadius="xl"
            bg="gray.50"
            borderWidth="1px"
            borderColor="gray.200"
          >
            <HStack spacing={2} mb={1.5} color="gray.600">
              <FaCalendarAlt size={13} />
              <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="0.05em">
                Lịch phỏng vấn dự kiến
              </Text>
            </HStack>
            <Text fontSize="sm" fontWeight="bold" color="gray.900">
              {interviewInfo}
            </Text>
          </Box>
        )}

        {/* State 1: Confirmed Successfully */}
        {state === 'Đã xác nhận' && (
          <Box
            p={4}
            borderRadius="xl"
            bg="green.50"
            borderWidth="1px"
            borderColor="green.200"
            textAlign="center"
          >
            <VStack spacing={2}>
              <Box color="green.600">
                <FaCheckCircle size={28} />
              </Box>
              <Text fontSize="sm" fontWeight="bold" color="green.900">
                Đã xác nhận tham gia phỏng vấn
              </Text>
              <Text fontSize="xs" color="green.700" lineHeight="tall">
                Cảm ơn bạn đã xác nhận. Ban Quản Lý CLB đã lưu thông tin. Vui lòng có mặt đúng giờ hoặc trước 10 phút để chuẩn bị nhé!
              </Text>
            </VStack>
          </Box>
        )}

        {/* State 2: Reschedule Requested */}
        {state === 'Xin đổi lịch' && (
          <VStack spacing={3} align="stretch">
            <Box
              p={4}
              borderRadius="xl"
              bg="orange.50"
              borderWidth="1px"
              borderColor="orange.200"
            >
              <HStack spacing={2} mb={1.5} color="orange.800">
                <FaHistory size={14} />
                <Text fontSize="xs" fontWeight="bold" textTransform="uppercase">
                  Yêu cầu đổi lịch đã được ghi nhận
                </Text>
              </HStack>
              <Text fontSize="xs" color="orange.900" mb={2}>
                &ldquo;{reschedule}&rdquo;
              </Text>
              <Text fontSize="xs" color="gray.600">
                BQL sẽ liên hệ lại qua SĐT hoặc Email bạn đã cung cấp để sắp xếp lịch phù hợp nhất.
              </Text>
            </Box>

            <Button
              variant="outline"
              colorScheme="primary"
              size="sm"
              borderRadius="lg"
              onClick={handleConfirm}
              isLoading={actionLoading}
            >
              Vẫn xác nhận theo lịch cũ
            </Button>
          </VStack>
        )}

        {/* State 3: Passed Screening (Initial Decision Action) */}
        {state === 'Đậu vòng đơn' && !showReschedule && (
          <VStack spacing={3} align="stretch" pt={1}>
            <Button
              colorScheme="primary"
              size="lg"
              borderRadius="xl"
              leftIcon={<FaCheck />}
              onClick={handleConfirm}
              isLoading={actionLoading}
            >
              Xác nhận tham gia phỏng vấn
            </Button>
            <Button
              variant="outline"
              colorScheme="gray"
              size="md"
              borderRadius="xl"
              leftIcon={<FaCalendarAlt />}
              onClick={() => setShowReschedule(true)}
            >
              Xin đổi lịch phỏng vấn
            </Button>
          </VStack>
        )}

        {/* State 4: Reschedule Form with Date & Time Pickers */}
        {state === 'Đậu vòng đơn' && showReschedule && (
          <Box
            p={4}
            borderRadius="xl"
            bg="gray.50"
            borderWidth="1px"
            borderColor="gray.200"
          >
            <VStack spacing={3.5} align="stretch">
              <HStack spacing={2} color="gray.800">
                <FaCalendarAlt size={14} />
                <Text fontSize="sm" fontWeight="bold">
                  Yêu cầu đổi lịch phỏng vấn
                </Text>
              </HStack>
              <Text fontSize="xs" color="gray.500">
                Vui lòng chọn ngày, giờ bạn mong muốn đổi sang và nêu rõ lý do:
              </Text>

              {/* Date & Time Input Grid */}
              <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
                <FormControl>
                  <FormLabel fontSize="xs" fontWeight="semibold" color="gray.600">
                    Ngày mong muốn
                  </FormLabel>
                  <Input
                    type="date"
                    size="sm"
                    bg="white"
                    borderRadius="md"
                    borderColor="gray.200"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="xs" fontWeight="semibold" color="gray.600">
                    Khung giờ mong muốn
                  </FormLabel>
                  <Input
                    type="time"
                    size="sm"
                    bg="white"
                    borderRadius="md"
                    borderColor="gray.200"
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                  />
                </FormControl>
              </SimpleGrid>

              {/* Reason Input */}
              <FormControl isRequired>
                <FormLabel fontSize="xs" fontWeight="semibold" color="gray.600">
                  Lý do chi tiết
                </FormLabel>
                <Textarea
                  placeholder="VD: Em bị trùng lịch thi học phần lúc 14h-16h, mong muốn đổi sang buổi tối..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  bg="white"
                  borderColor="gray.200"
                  borderRadius="md"
                  fontSize="xs"
                  rows={3}
                />
              </FormControl>

              {/* Action Buttons */}
              <HStack spacing={2} pt={1}>
                <Button
                  colorScheme="primary"
                  size="sm"
                  borderRadius="lg"
                  flex="1"
                  onClick={handleReschedule}
                  isLoading={actionLoading}
                  loadingText="Đang gửi..."
                >
                  Gửi yêu cầu đổi lịch
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  borderRadius="lg"
                  leftIcon={<FaArrowLeft />}
                  onClick={() => setShowReschedule(false)}
                >
                  Quay lại
                </Button>
              </HStack>
            </VStack>
          </Box>
        )}

        {/* State: Other unhandled statuses */}
        {!['Đậu vòng đơn', 'Xin đổi lịch', 'Đã xác nhận'].includes(state) && (
          <Text color="gray.500" textAlign="center" fontSize="xs" pt={2}>
            Không có thao tác khả dụng ở bước này. Vui lòng liên hệ BQL CLB nếu bạn cần hỗ trợ.
          </Text>
        )}
      </VStack>
    </CardShell>
  );
};

export default ConfirmParticipation;

