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
  Flex,
  Image
} from '@chakra-ui/react';
import { CheckIcon, ViewIcon } from '@chakra-ui/icons';

const ViewSelection = ({ onSelectView }) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const cardHoverBg = useColorModeValue('gray.50', 'gray.700');

  const viewOptions = [
    {
      id: 'checkin',
      title: '📋 Giao Diện Check-in',
      description: 'Quản lý danh sách thành viên và thực hiện check-in cho sự kiện',
      icon: CheckIcon,
      color: 'blue',
      features: [
        'Xem danh sách thành viên',
        'Thực hiện check-in với số bốc thăm',
        'Thêm/sửa/xóa thành viên',
        'Cập nhật thông tin thành viên'
      ]
    },
    {
      id: 'statistics',
      title: '📊 Giao Diện Thống Kê',
      description: 'Xem thống kê chi tiết về tình hình tham dự sự kiện',
      icon: ViewIcon,
      color: 'purple',
      features: [
        'Thống kê tổng quan tham dự',
        'Phân tích theo khoa/tổ chức',
        'Theo dõi tỷ lệ check-in',
        'Báo cáo thời gian thực'
      ]
    }
  ];

  return (
    <Box 
      minH="100vh" 
      bg={useColorModeValue('gray.50', 'gray.900')}
      py={12}
    >
      <Container maxW="6xl">
        {/* Header */}
        <VStack spacing={8} mb={12} textAlign="center">
          <Image 
            src="/logobkauto.png" 
            alt="BK-AUTO Logo" 
            h="80px" 
            objectFit="contain"
          />
          
          <Text
            fontSize={'5xl'}
            fontWeight={800}
            textTransform={'uppercase'}
            bgGradient={'linear(to-r, pink.400, purple.500)'}
            bgClip={'text'}
          >
            Kỷ Niệm 15 Năm BK-AUTO
          </Text>
          
          <Text
            fontSize="xl"
            color="gray.600"
            maxW="2xl"
          >
            Chào mừng bạn đến với hệ thống quản lý sự kiện kỷ niệm 15 năm thành lập CLB BK-AUTO. 
            Vui lòng chọn giao diện phù hợp với công việc của bạn.
          </Text>
        </VStack>

        {/* View Options */}
        <HStack spacing={8} justify="center" align="stretch">
          {viewOptions.map((option) => (
            <Card
              key={option.id}
              maxW="400px"
              w="full"
              bg={bgColor}
              border="2px"
              borderColor={borderColor}
              borderRadius="xl"
              shadow="lg"
              _hover={{
                shadow: '2xl',
                transform: 'translateY(-4px)',
                bg: cardHoverBg,
                borderColor: `${option.color}.300`
              }}
              transition="all 0.3s ease"
              cursor="pointer"
              onClick={() => onSelectView(option.id)}
            >
              <CardBody p={8}>
                <VStack spacing={6} align="center" textAlign="center">
                  {/* Icon */}
                  <Box
                    p={4}
                    bg={`${option.color}.100`}
                    borderRadius="full"
                    color={`${option.color}.500`}
                  >
                    <Icon as={option.icon} boxSize={8} />
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
                    color="gray.600"
                    lineHeight="1.6"
                  >
                    {option.description}
                  </Text>

                  {/* Features */}
                  <VStack spacing={3} align="stretch" w="full">
                    <Text fontSize="sm" fontWeight="bold" color="gray.700">
                      Tính năng chính:
                    </Text>
                    {option.features.map((feature, index) => (
                      <HStack key={index} spacing={2}>
                        <CheckIcon color="green.500" boxSize={3} />
                        <Text fontSize="sm" color="gray.600">
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
                    _hover={{
                      transform: 'scale(1.05)'
                    }}
                    transition="transform 0.2s"
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
          <Text fontSize="sm" color="gray.500">
            🎉 Chúc mừng kỷ niệm 15 năm thành lập CLB BK-AUTO - Cùng nhau vững bước tương lai! 🎉
          </Text>
        </Box>
      </Container>
    </Box>
  );
};

export default ViewSelection;
