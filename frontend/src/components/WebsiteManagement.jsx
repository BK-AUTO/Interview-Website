import React from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  SimpleGrid,
  Divider,
  Badge,
} from '@chakra-ui/react';
import {
  SettingsIcon,
} from '@chakra-ui/icons';
import {
  FaUsers,
  FaShieldAlt,
  FaExternalLinkAlt,
} from 'react-icons/fa';

const WebsiteManagement = ({ setActiveTab }) => {
  return (
    <Box pb={8}>
      {/* Page Title */}
      <Box mb={6}>
        <HStack spacing={3} mb={1}>
          <Box p={2} borderRadius="lg" bg="rgba(58, 197, 105, 0.12)" color="primary.500">
            <SettingsIcon boxSize={5} />
          </Box>
          <Box>
            <Heading fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color="gray.900">
              Cấu hình hệ thống & Quản trị Website
            </Heading>
            <Text fontSize="xs" color="gray.500">
              Các thông số kết nối, liên kết nền tảng BK-AUTO và quản lý tuyển dụng
            </Text>
          </Box>
        </HStack>
      </Box>

      {/* Settings Grid */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
        {/* Module Điều phối tuyển dụng */}
        <Box p={5} borderRadius="xl" bg="white" borderWidth="1px" borderColor="gray.200">
          <HStack spacing={3} mb={3}>
            <Box p={2.5} borderRadius="lg" bg="rgba(58, 197, 105, 0.12)" color="primary.500">
              <FaUsers size={18} />
            </Box>
            <Box>
              <Heading fontSize="md" fontWeight="bold" color="gray.900">
                Cơ sở dữ liệu ứng viên
              </Heading>
              <Text fontSize="xs" color="gray.500">
                Điều hướng nhanh tới các phân hệ quản lý
              </Text>
            </Box>
          </HStack>
          <Divider borderColor="gray.200" mb={4} />
          <VStack spacing={3} align="stretch">
            <Button
              justifyContent="space-between"
              variant="outline"
              colorScheme="primary"
              onClick={() => setActiveTab(0)}
              size="sm"
            >
              <Text>Duyệt hồ sơ vòng đơn</Text>
              <Badge colorScheme="primary">Tab 1</Badge>
            </Button>
            <Button
              justifyContent="space-between"
              variant="outline"
              colorScheme="primary"
              onClick={() => setActiveTab(1)}
              size="sm"
            >
              <Text>Ứng viên đã duyệt & Lấy link</Text>
              <Badge colorScheme="primary">Tab 2</Badge>
            </Button>
            <Button
              justifyContent="space-between"
              variant="outline"
              colorScheme="primary"
              onClick={() => setActiveTab(2)}
              size="sm"
            >
              <Text>Quản lý toàn bộ ứng viên</Text>
              <Badge colorScheme="primary">Tab 3</Badge>
            </Button>
          </VStack>
        </Box>

        {/* Thông tin hệ thống & SSO */}
        <Box p={5} borderRadius="xl" bg="white" borderWidth="1px" borderColor="gray.200">
          <HStack spacing={3} mb={3}>
            <Box p={2.5} borderRadius="lg" bg="rgba(24, 144, 255, 0.12)" color="info.500">
              <FaShieldAlt size={18} />
            </Box>
            <Box>
              <Heading fontSize="md" fontWeight="bold" color="gray.900">
                Xác thực & Hạ tầng
              </Heading>
              <Text fontSize="xs" color="gray.500">
                Trạng thái Authentik SSO & CSDL
              </Text>
            </Box>
          </HStack>
          <Divider borderColor="gray.200" mb={4} />
          <VStack spacing={3} align="stretch" fontSize="xs">
            <Flex justify="space-between" p={2.5} borderRadius="md" bg="gray.50">
              <Text color="gray.600">Dịch vụ SSO:</Text>
              <Badge bg="rgba(58, 197, 105, 0.15)" color="primary.600" border="1px solid rgba(58, 197, 105, 0.3)">
                Authentik OIDC Active
              </Badge>
            </Flex>
            <Flex justify="space-between" p={2.5} borderRadius="md" bg="gray.50">
              <Text color="gray.600">Database Engine:</Text>
              <Badge bg="gray.100" color="gray.700">
                SQLite (Persistent Volume)
              </Badge>
            </Flex>
            <Flex justify="space-between" p={2.5} borderRadius="md" bg="gray.50">
              <Text color="gray.600">Website chính thức:</Text>
              <Button
                as="a"
                href="https://bkauto.vn"
                target="_blank"
                size="xs"
                variant="link"
                colorScheme="primary"
                rightIcon={<FaExternalLinkAlt size={10} />}
              >
                bkauto.vn
              </Button>
            </Flex>
          </VStack>
        </Box>
      </SimpleGrid>
    </Box>
  );
};

export default WebsiteManagement;
