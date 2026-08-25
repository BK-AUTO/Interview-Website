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
  useToast,
} from '@chakra-ui/react';
import { BASE_URL } from '../config';

// Standalone axios instance — this page is public (no Authentik session, no
// Bearer token), auth here is the URL token + the one-time password only.
const api = axios.create({ baseURL: BASE_URL });

const CardShell = ({ children }) => (
  <Center minH="100vh" bg="dark.900" px={4}>
    <Box maxW="sm" w="full" bg="dark.800" borderRadius="lg" borderWidth="1px" borderColor="dark.border" p={8}>
      <Image src="/logobkauto.png" alt="BK-AUTO" width="100px" mx="auto" mb={6} />
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
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    api.get(`/api/confirm/${token}`)
      .then(() => setPhase('password'))
      .catch(() => setPhase('invalid'));
  }, [token]);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const response = await api.post(`/api/confirm/${token}/verify`, { password });
      setSummary(response.data);
      setPhase('verified');
    } catch (error) {
      toast({
        title: error.response?.data?.message || 'Mật khẩu không đúng',
        status: 'error',
        duration: 3000,
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
      toast({ title: 'Xác nhận thành công!', status: 'success', duration: 3000, isClosable: true });
    } catch (error) {
      toast({
        title: error.response?.data?.message || 'Có lỗi xảy ra',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!reason.trim()) {
      toast({ title: 'Vui lòng nhập lý do/thời gian mong muốn', status: 'warning', duration: 3000, isClosable: true });
      return;
    }
    setActionLoading(true);
    try {
      const response = await api.post(`/api/confirm/${token}/reschedule`, { password, reason });
      setSummary(response.data);
      setShowReschedule(false);
      toast({ title: 'Đã gửi yêu cầu đổi lịch', status: 'success', duration: 3000, isClosable: true });
    } catch (error) {
      toast({
        title: error.response?.data?.message || 'Có lỗi xảy ra',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (phase === 'checking') {
    return (
      <CardShell>
        <Center><Spinner color="primary.500" /></Center>
      </CardShell>
    );
  }

  if (phase === 'invalid') {
    return (
      <CardShell>
        <Heading size="md" color="white" textAlign="center" mb={2}>Link không hợp lệ</Heading>
        <Text color="whiteAlpha.700" textAlign="center" fontSize="sm">
          Link này không tồn tại hoặc đã hết hạn. Vui lòng liên hệ Ban Quản Lý CLB BK-AUTO để được hỗ trợ.
        </Text>
      </CardShell>
    );
  }

  if (phase === 'password') {
    return (
      <CardShell>
        <Heading size="md" color="white" textAlign="center" mb={2}>Xác nhận tham gia phỏng vấn</Heading>
        <Text color="whiteAlpha.700" textAlign="center" fontSize="sm" mb={6}>
          Nhập mật khẩu đã được BQL CLB gửi cho bạn
        </Text>
        <VStack spacing={4}>
          <Input
            placeholder="Mật khẩu 6 số"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            bg="dark.900" color="white" borderColor="dark.border" textAlign="center" fontSize="xl" letterSpacing="4px"
            maxLength={6}
          />
          <Button colorScheme="primary" w="full" onClick={handleVerify} isLoading={verifying}>
            Tiếp tục
          </Button>
        </VStack>
      </CardShell>
    );
  }

  // phase === 'verified'
  const { name, specialist, state, reschedule_request: reschedule, interview_info: interviewInfo } = summary;

  return (
    <CardShell>
      <Heading size="md" color="white" textAlign="center" mb={4}>Xin chào, {name}!</Heading>
      <Text color="whiteAlpha.800" textAlign="center" fontSize="sm" mb={1}>Mảng ứng tuyển: {specialist}</Text>
      {interviewInfo && (
        <Text color="whiteAlpha.700" textAlign="center" fontSize="sm" mb={4}>
          Lịch phỏng vấn: {interviewInfo}
        </Text>
      )}

      {state === 'Đã xác nhận' && (
        <Text color="primary.500" textAlign="center" fontWeight="semibold" mt={4}>
          Bạn đã xác nhận tham gia phỏng vấn. Hẹn gặp bạn tại buổi phỏng vấn!
        </Text>
      )}

      {state === 'Xin đổi lịch' && (
        <VStack spacing={3} mt={4}>
          <Text color="warning.500" textAlign="center" fontSize="sm">
            Yêu cầu đổi lịch của bạn đã được ghi nhận: &ldquo;{reschedule}&rdquo;. BQL sẽ liên hệ lại qua SĐT/email bạn đã cung cấp.
          </Text>
          <Button variant="outline" colorScheme="primary" size="sm" onClick={handleConfirm} isLoading={actionLoading}>
            Vẫn xác nhận theo lịch cũ
          </Button>
        </VStack>
      )}

      {state === 'Đậu vòng đơn' && !showReschedule && (
        <VStack spacing={3} mt={4}>
          <Button colorScheme="primary" w="full" onClick={handleConfirm} isLoading={actionLoading}>
            Xác nhận tham gia phỏng vấn
          </Button>
          <Button variant="outline" colorScheme="primary" w="full" onClick={() => setShowReschedule(true)}>
            Xin đổi lịch
          </Button>
        </VStack>
      )}

      {state === 'Đậu vòng đơn' && showReschedule && (
        <VStack spacing={3} mt={4} align="stretch">
          <Textarea
            placeholder="Lý do / thời gian bạn mong muốn đổi sang..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            bg="dark.900" color="white" borderColor="dark.border"
          />
          <Button colorScheme="primary" onClick={handleReschedule} isLoading={actionLoading}>
            Gửi yêu cầu đổi lịch
          </Button>
          <Button variant="ghost" color="whiteAlpha.700" onClick={() => setShowReschedule(false)}>
            Quay lại
          </Button>
        </VStack>
      )}

      {!['Đậu vòng đơn', 'Xin đổi lịch', 'Đã xác nhận'].includes(state) && (
        <Text color="whiteAlpha.700" textAlign="center" fontSize="sm" mt={4}>
          Không có hành động khả dụng ở bước này. Liên hệ BQL CLB nếu bạn cần hỗ trợ.
        </Text>
      )}
    </CardShell>
  );
};

export default ConfirmParticipation;
