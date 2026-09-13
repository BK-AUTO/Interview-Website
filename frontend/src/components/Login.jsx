import React from 'react';
import {
  Box,
  Button,
  Image,
  Heading,
  Text,
  VStack,
  HStack,
  Center,
} from '@chakra-ui/react';
import { FaShieldAlt, FaKey, FaArrowRight } from 'react-icons/fa';
import { BASE_URL } from '../config';

// Dark gradient hero — mirrors the login pages of LEMS and PCG
// (proxmoxcontrolGUI) for a consistent BK-AUTO login experience across apps.
const Login = () => {
  const handleLogin = () => {
    window.location.assign(`${BASE_URL}/api/auth/login`);
  };

  return (
    <Center minH="100vh" bg="#141414" px={4} py={8} position="relative" overflow="hidden">
      {/* Layered gradient background */}
      <Box
        position="absolute"
        inset={0}
        bgGradient="linear(to-br, #141414, #1a1a1a, #0a0a0a)"
        zIndex={0}
      />
      {/* Green glow — top center */}
      <Box
        position="absolute"
        top="-15%"
        left="50%"
        transform="translateX(-50%)"
        w="800px"
        h="800px"
        maxW="150vw"
        borderRadius="full"
        bg="rgba(58, 197, 105, 0.08)"
        filter="blur(80px)"
        pointerEvents="none"
        zIndex={0}
      />
      {/* Purple glow — bottom right */}
      <Box
        position="absolute"
        bottom="-15%"
        right="-10%"
        w="600px"
        h="600px"
        maxW="120vw"
        borderRadius="full"
        bg="rgba(179, 127, 235, 0.05)"
        filter="blur(80px)"
        pointerEvents="none"
        zIndex={0}
      />
      {/* Grid pattern overlay */}
      <Box
        position="absolute"
        inset={0}
        opacity={0.03}
        pointerEvents="none"
        zIndex={0}
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <VStack spacing={8} position="relative" zIndex={1} w="full" maxW="420px">
        {/* Logo & Branding */}
        <VStack spacing={4}>
          <Box
            w="72px"
            h="72px"
            borderRadius="2xl"
            bg="rgba(58, 197, 105, 0.1)"
            border="1px solid"
            borderColor="rgba(58, 197, 105, 0.3)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            p={2}
          >
            <Image src="/logobkauto.png" alt="BK-AUTO" objectFit="contain" />
          </Box>
          <Box textAlign="center">
            <Text
              fontSize="lg"
              fontWeight="bold"
              color="whiteAlpha.800"
              fontFamily="mono"
              letterSpacing="0.2em"
            >
              BK-AUTO
            </Text>
            <Text fontSize="xs" color="whiteAlpha.500">
              Interview Management Portal
            </Text>
          </Box>
        </VStack>

        {/* Login Card */}
        <Box
          w="full"
          borderRadius="lg"
          border="1px solid"
          borderColor="dark.border"
          bg="rgba(31, 31, 31, 0.8)"
          backdropFilter="blur(20px)"
          boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.6)"
        >
          <Box textAlign="center" pt={6} pb={2} px={6}>
            <Heading fontSize="xl" fontWeight="semibold" color="white" letterSpacing="-0.01em">
              Đăng nhập
            </Heading>
            <Text fontSize="sm" color="whiteAlpha.500" mt={1}>
              Sử dụng tài khoản Authentik SSO của CLB để truy cập hệ thống
            </Text>
          </Box>

          <VStack spacing={5} align="stretch" px={6} pb={6} pt={3}>
            <Button
              size="lg"
              colorScheme="primary"
              h="48px"
              fontSize="sm"
              leftIcon={<FaKey />}
              rightIcon={<FaArrowRight style={{ opacity: 0.5, marginLeft: 'auto' }} />}
              onClick={handleLogin}
              justifyContent="space-between"
              boxShadow="0 4px 14px rgba(58, 197, 105, 0.35)"
              _hover={{
                bg: 'primary.600',
                boxShadow: '0 6px 20px rgba(58, 197, 105, 0.45)',
                transform: 'translateY(-1px)',
              }}
            >
              Đăng nhập với Authentik SSO
            </Button>
          </VStack>
        </Box>

        {/* Footer */}
        <VStack spacing={3}>
          <HStack spacing={1.5} justify="center" fontSize="11px" color="whiteAlpha.400">
            <FaShieldAlt size={10} />
            <Text>Bảo mật bởi BK-AUTO Single Sign-On (sso.bkauto.vn)</Text>
          </HStack>
          <HStack spacing={1.5} fontSize="10px" color="whiteAlpha.300">
            <Box w="6px" h="6px" borderRadius="full" bg="rgba(58, 197, 105, 0.6)" className="live-pulse" />
            <Text>System Online</Text>
          </HStack>
        </VStack>
      </VStack>
    </Center>
  );
};

export default Login;
