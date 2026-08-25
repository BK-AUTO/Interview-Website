import React from 'react';
import {
  Box,
  Button,
  Image,
  Heading,
  Text,
  VStack,
  HStack,
  Container,
  Center,
  Badge,
} from '@chakra-ui/react';
import { FaShieldAlt } from 'react-icons/fa';
import { BASE_URL } from '../config';

const Login = () => {
  const handleLogin = () => {
    window.location.assign(`${BASE_URL}/api/auth/login`);
  };

  return (
    <Center minH="100vh" bg="#0a0a0a" px={4} position="relative" overflow="hidden">
      {/* Subtle Background Glows */}
      <Box
        position="absolute"
        top="-10%"
        left="50%"
        transform="translateX(-50%)"
        w="500px"
        h="500px"
        bg="radial-gradient(circle, rgba(58, 197, 105, 0.08) 0%, rgba(0, 0, 0, 0) 70%)"
        pointerEvents="none"
      />

      <Container maxW="md" position="relative" zIndex={1}>
        <Box
          p={{ base: 6, md: 8 }}
          borderRadius="2xl"
          bg="dark.850"
          borderWidth="1px"
          borderColor="dark.border"
          boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)"
          textAlign="center"
        >
          {/* Logo & Branding */}
          <Box
            w="64px"
            h="64px"
            borderRadius="2xl"
            bg="rgba(58, 197, 105, 0.1)"
            border="1px solid"
            borderColor="rgba(58, 197, 105, 0.3)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            mx="auto"
            mb={5}
            p={2}
          >
            <Image src="/logobkauto.png" alt="BK-AUTO" objectFit="contain" />
          </Box>

          <Heading
            fontSize="2xl"
            fontWeight="bold"
            color="white"
            fontFamily="heading"
            letterSpacing="-0.02em"
            mb={1}
          >
            BK-AUTO
          </Heading>

          <HStack justify="center" spacing={2} mb={4}>
            <Badge
              bg="rgba(58, 197, 105, 0.15)"
              color="primary.500"
              border="1px solid"
              borderColor="rgba(58, 197, 105, 0.3)"
              fontSize="xs"
              px={2.5}
              py={0.5}
              borderRadius="full"
              fontWeight="bold"
            >
              Interview Management Portal
            </Badge>
          </HStack>

          <Text fontSize="sm" color="whiteAlpha.600" mb={8} px={2}>
            Hệ thống quản lý ứng viên và điều phối phỏng vấn tuyển thành viên CLB Nghiên cứu & Ứng dụng Tự động hoá BK-AUTO.
          </Text>

          {/* Login Button */}
          <VStack spacing={4} align="stretch">
            <Button
              size="lg"
              colorScheme="primary"
              h="48px"
              fontSize="sm"
              fontWeight="bold"
              leftIcon={<FaShieldAlt />}
              onClick={handleLogin}
              boxShadow="0 4px 14px rgba(58, 197, 105, 0.35)"
              _hover={{
                bg: 'primary.600',
                boxShadow: '0 6px 20px rgba(58, 197, 105, 0.45)',
                transform: 'translateY(-1px)',
              }}
            >
              Đăng nhập qua Authentik SSO
            </Button>
          </VStack>

          {/* Security Note */}
          <Box mt={8} pt={6} borderTop="1px" borderColor="dark.border">
            <Text fontSize="11px" color="whiteAlpha.400">
              Quyền truy cập được xác thực và bảo mật bởi BK-AUTO Single Sign-On (sso.bkauto.vn)
            </Text>
          </Box>
        </Box>
      </Container>
    </Center>
  );
};

export default Login;
