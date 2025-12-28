import React from 'react';
import {
  Box,
  Container,
  Text,
  Button,
  VStack,
  HStack,
  useColorModeValue,
  Card,
  CardBody,
  Icon,
  Image,
  keyframes
} from '@chakra-ui/react';
import { CheckIcon, ViewIcon } from '@chakra-ui/icons';

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
`;

const ViewSelection = ({ onSelectView }) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('orange.200', 'orange.700');
  const cardHoverBg = useColorModeValue('orange.50', 'gray.700');
  const gradientBg = useColorModeValue(
    'linear-gradient(135deg, #fff5eb 0%, #ffe4cc 50%, #ffd4b3 100%)',
    'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
  );

  const viewOptions = [
    {
      id: 'checkin',
      title: '📋 Giao Diện Check-in',
      description: 'Quản lý danh sách thành viên và thực hiện check-in cho sự kiện YEP 2025',
      icon: CheckIcon,
      color: 'orange',
      features: [
        'Xem danh sách thành viên',
        'Check-in phần Lễ / Hội riêng biệt',
        'Thêm/sửa/xóa thành viên',
        'Hỗ trợ tìm kiếm theo tên, MSSV, khóa'
      ]
    },
    {
      id: 'statistics',
      title: '📊 Giao Diện Thống Kê',
      description: 'Xem thống kê chi tiết về tình hình tham dự YEP 2025',
      icon: ViewIcon,
      color: 'blue',
      features: [
        'Thống kê tổng quan tham dự',
        'Phân tích theo Khóa (K61-K70)',
        'Theo dõi check-in Lễ / Hội',
        'So sánh CSV vs SV hiện tại'
      ]
    }
  ];

  return (
    <Box 
      minH="100vh" 
      bg={gradientBg}
      py={12}
      position="relative"
      overflow="hidden"
    >
      {/* Decorative elements */}
      <Box
        position="absolute"
        top="-50px"
        right="-50px"
        w="200px"
        h="200px"
        bg="orange.300"
        borderRadius="full"
        opacity="0.2"
        filter="blur(40px)"
      />
      <Box
        position="absolute"
        bottom="-100px"
        left="-100px"
        w="300px"
        h="300px"
        bg="orange.400"
        borderRadius="full"
        opacity="0.15"
        filter="blur(60px)"
      />

      <Container maxW="6xl" position="relative" zIndex={1}>
        {/* Header */}
        <VStack spacing={6} mb={12} textAlign="center">
          <Box animation={`${float} 3s ease-in-out infinite`}>
            <Image 
              src="/logobkauto.png" 
              alt="BK-AUTO Logo" 
              h="100px" 
              objectFit="contain"
              filter="drop-shadow(0 4px 6px rgba(0,0,0,0.1))"
            />
          </Box>
          
          <Text
            fontSize={{ base: '3xl', md: '5xl' }}
            fontWeight={800}
            bgGradient={'linear(to-r, orange.400, orange.600, red.500)'}
            bgClip={'text'}
            textShadow="2px 2px 4px rgba(0,0,0,0.1)"
          >
            BK-AUTO YEP 2025
          </Text>
          
          <Text
            fontSize={{ base: 'xl', md: '2xl' }}
            fontWeight={600}
            color={useColorModeValue('orange.600', 'orange.300')}
          >
            🎊 Year End Party 🎊
          </Text>
          
          <Text
            fontSize="lg"
            color={useColorModeValue('gray.600', 'gray.400')}
            maxW="2xl"
          >
            Chào mừng đến với hệ thống quản lý sự kiện tất niên CLB BK-AUTO. 
            Vui lòng chọn giao diện phù hợp với công việc của bạn.
          </Text>
        </VStack>

        {/* View Options */}
        <HStack spacing={8} justify="center" align="stretch" flexWrap="wrap">
          {viewOptions.map((option) => (
            <Card
              key={option.id}
              maxW="420px"
              w="full"
              bg={bgColor}
              border="3px"
              borderColor={borderColor}
              borderRadius="2xl"
              shadow="xl"
              _hover={{
                shadow: '2xl',
                transform: 'translateY(-8px)',
                bg: cardHoverBg,
                borderColor: `${option.color}.400`
              }}
              transition="all 0.3s ease"
              cursor="pointer"
              onClick={() => onSelectView(option.id)}
              animation={`${pulse} 4s ease-in-out infinite`}
            >
              <CardBody p={8}>
                <VStack spacing={6} align="center" textAlign="center">
                  {/* Icon */}
                  <Box
                    p={5}
                    bg={`${option.color}.100`}
                    borderRadius="2xl"
                    color={`${option.color}.500`}
                    boxShadow={`0 4px 14px ${option.color === 'orange' ? 'rgba(255,107,53,0.3)' : 'rgba(59,130,246,0.3)'}`}
                  >
                    <Icon as={option.icon} boxSize={10} />
                  </Box>

                  {/* Title */}
                  <Text
                    fontSize="2xl"
                    fontWeight="bold"
                    color={`${option.color}.500`}
                  >
                    {option.title}
                  </Text>

                  {/* Description */}
                  <Text
                    fontSize="md"
                    color={useColorModeValue('gray.600', 'gray.400')}
                    lineHeight="1.6"
                  >
                    {option.description}
                  </Text>

                  {/* Features */}
                  <VStack spacing={3} align="stretch" w="full">
                    <Text fontSize="sm" fontWeight="bold" color={useColorModeValue('gray.700', 'gray.300')}>
                      Tính năng chính:
                    </Text>
                    {option.features.map((feature, index) => (
                      <HStack key={index} spacing={2}>
                        <CheckIcon color="green.500" boxSize={3} />
                        <Text fontSize="sm" color={useColorModeValue('gray.600', 'gray.400')}>
                          {feature}
                        </Text>
                      </HStack>
                    ))}
                  </VStack>

                  {/* Action Button */}
                  <Button
                    colorScheme={option.color}
                    size="lg"
                    w="full"
                    mt={4}
                    borderRadius="xl"
                    fontWeight="bold"
                    boxShadow="lg"
                    _hover={{
                      transform: 'scale(1.02)',
                      boxShadow: 'xl'
                    }}
                    transition="all 0.2s"
                  >
                    Chọn Giao Diện
                  </Button>
                </VStack>
              </CardBody>
            </Card>
          ))}
        </HStack>

        {/* Footer */}
        <Box mt={12} textAlign="center">
          <Text 
            fontSize="md" 
            color={useColorModeValue('orange.600', 'orange.400')}
            fontWeight="600"
          >
            🎉 BK-AUTO YEP 2025 - Year End Party 🎉
          </Text>
        </Box>
      </Container>
    </Box>
  );
};

export default ViewSelection;
