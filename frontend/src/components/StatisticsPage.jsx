import React from 'react';
import {
  Container,
  Box,
  Grid,
  GridItem,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useColorModeValue,
  Text,
  VStack,
  HStack,
  Badge,
  Divider,
  Button,
  Progress
} from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';

const StatisticsPage = ({ members = [] }) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const cardBg = useColorModeValue('gray.50', 'gray.700');

  // Tính toán thống kê
  const totalMembers = members.length;
  const checkedInMembers = members.filter(member => member.state === 'Đã checkin').length;
  const checkinRate = totalMembers > 0 ? ((checkedInMembers / totalMembers) * 100).toFixed(1) : 0;

  // Thống kê theo tổ chức
  const organizationStats = members.reduce((acc, member) => {
    const org = member.organization || 'Không xác định';
    if (!acc[org]) {
      acc[org] = { total: 0, checkedIn: 0 };
    }
    acc[org].total++;
    if (member.state === 'Đã checkin') {
      acc[org].checkedIn++;
    }
    return acc;
  }, {});

  // Thống kê theo vai trò cũ
  const roleStats = members.reduce((acc, member) => {
    const role = member.former_role || 'Không xác định';
    if (!acc[role]) {
      acc[role] = { total: 0, checkedIn: 0 };
    }
    acc[role].total++;
    if (member.state === 'Đã checkin') {
      acc[role].checkedIn++;
    }
    return acc;
  }, {});

  const StatCard = ({ title, data, colorScheme = 'blue' }) => (
    <Box
      p={6}
      bg={cardBg}
      border="1px"
      borderColor={borderColor}
      borderRadius="xl"
      shadow="md"
      _hover={{ shadow: 'lg', transform: 'translateY(-2px)' }}
      transition="all 0.2s"
    >
      <Text fontSize="lg" fontWeight="bold" mb={4} color={`${colorScheme}.500`}>
        {title}
      </Text>
      <VStack spacing={3} align="stretch">
        {Object.entries(data)
          .sort(([,a], [,b]) => b.total - a.total)
          .slice(0, 6)
          .map(([key, stats]) => {
            const rate = stats.total > 0 ? (stats.checkedIn / stats.total) * 100 : 0;
            return (
              <Box key={key}>
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="sm" fontWeight="medium" noOfLines={1} flex={1}>
                    {key}
                  </Text>
                  <HStack spacing={2}>
                    <Badge colorScheme="green" variant="subtle">
                      {stats.checkedIn}
                    </Badge>
                    <Text fontSize="sm" color="gray.500">
                      /{stats.total}
                    </Text>
                    <Text fontSize="xs" color="gray.400">
                      ({rate.toFixed(0)}%)
                    </Text>
                  </HStack>
                </HStack>
                <Progress
                  value={rate}
                  size="sm"
                  colorScheme={colorScheme}
                  bg="gray.200"
                  borderRadius="full"
                />
              </Box>
            );
          })}
      </VStack>
    </Box>
  );

  return (
    <Container maxW="7xl" py={8}>

      {/* Thống kê tổng quan */}
      <Grid templateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={8} mb={8}>
        <GridItem>
          <Stat
            p={6}
            bg={bgColor}
            border="2px"
            borderColor="blue.200"
            borderRadius="xl"
            shadow="lg"
            textAlign="center"
          >
            <StatLabel fontSize="md" color="gray.600">Tổng Thành Viên</StatLabel>
            <StatNumber fontSize="4xl" color="blue.500" fontWeight="bold">
              {totalMembers}
            </StatNumber>
            <StatHelpText fontSize="sm">Đã đăng ký tham dự</StatHelpText>
          </Stat>
        </GridItem>
        
        <GridItem>
          <Stat
            p={6}
            bg={bgColor}
            border="2px"
            borderColor="green.200"
            borderRadius="xl"
            shadow="lg"
            textAlign="center"
          >
            <StatLabel fontSize="md" color="gray.600">Đã Check-in</StatLabel>
            <StatNumber fontSize="4xl" color="green.500" fontWeight="bold">
              {checkedInMembers}
            </StatNumber>
            <StatHelpText fontSize="sm">
              Tỷ lệ: {checkinRate}%
              <Progress 
                value={checkinRate} 
                size="sm" 
                colorScheme="green" 
                mt={2}
                borderRadius="full"
              />
            </StatHelpText>
          </Stat>
        </GridItem>

        <GridItem>
          <Stat
            p={6}
            bg={bgColor}
            border="2px"
            borderColor="orange.200"
            borderRadius="xl"
            shadow="lg"
            textAlign="center"
          >
            <StatLabel fontSize="md" color="gray.600">Chưa Check-in</StatLabel>
            <StatNumber fontSize="4xl" color="orange.500" fontWeight="bold">
              {totalMembers - checkedInMembers}
            </StatNumber>
            <StatHelpText fontSize="sm">Còn lại</StatHelpText>
          </Stat>
        </GridItem>
      </Grid>

      <Divider mb={8} />

      {/* Thống kê chi tiết */}
      <Grid templateColumns="repeat(auto-fit, minmax(350px, 1fr))" gap={8} mb={8}>
        <GridItem>
          <StatCard 
            title="🏢 Thống Kê Theo Tổ Chức" 
            data={organizationStats} 
            colorScheme="green"
          />
        </GridItem>
        
        <GridItem>
          <StatCard 
            title="👤 Thống Kê Theo Vai Trò Cũ" 
            data={roleStats} 
            colorScheme="orange"
          />
        </GridItem>
      </Grid>

      <Divider mb={8} />

      {/* Danh sách cựu thành viên đã tham dự */}
      <Box
        p={6}
        bg={cardBg}
        border="1px"
        borderColor={borderColor}
        borderRadius="xl"
        shadow="md"
        mb={8}
      >
        <Text fontSize="2xl" fontWeight="bold" mb={6} color="purple.500" textAlign="center">
          🎉 Danh Sách Cựu Thành Viên Đã Tham Dự
        </Text>
        
        {checkedInMembers === 0 ? (
          <Box textAlign="center" py={8}>
            <Text color="gray.500" fontStyle="italic" fontSize="lg">
              Chưa có thành viên nào check-in
            </Text>
          </Box>
        ) : (
          <>
            <Text fontSize="md" color="gray.600" mb={4} textAlign="center">
              Tổng cộng: <Badge colorScheme="green" fontSize="sm">{checkedInMembers}</Badge> thành viên đã check-in
            </Text>
            <Grid templateColumns="repeat(auto-fit, minmax(320px, 1fr))" gap={4}>
              {members
                .filter(member => member.state === 'Đã checkin')
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((member, index) => (
                  <Box
                    key={member.id || index}
                    p={4}
                    border="2px"
                    borderColor="green.200"
                    borderRadius="lg"
                    bg="green.50"
                    _hover={{ 
                      shadow: 'md', 
                      transform: 'translateY(-2px)',
                      borderColor: 'green.300'
                    }}
                    transition="all 0.2s"
                  >
                    <VStack spacing={3} align="start">
                      <HStack justify="space-between" w="100%">
                        <Text fontWeight="bold" color="green.700" fontSize="lg">
                          {member.name}
                        </Text>
                        <Badge colorScheme="green" fontSize="sm" px={3} py={1}>
                          Số {member.lottery_number || 'N/A'}
                        </Badge>
                      </HStack>
                      
                      <Text fontSize="sm" color="gray.600" fontWeight="medium">
                        MSSV: {member.MSSV || 'N/A'}
                      </Text>
                      
                      <HStack spacing={2} wrap="wrap">
                        <Badge colorScheme="blue" fontSize="xs" px={2} py={1}>
                          {member.organization || 'N/A'}
                        </Badge>
                        <Badge colorScheme="purple" fontSize="xs" px={2} py={1}>
                          {member.former_role || 'N/A'}
                        </Badge>
                      </HStack>
                      
                      {member.checkin_time && (
                        <Text fontSize="xs" color="gray.500" fontStyle="italic">
                          ⏰ Check-in: {new Date(member.checkin_time).toLocaleString('vi-VN', {
                            timeZone: 'Asia/Ho_Chi_Minh',
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false
                          })}
                        </Text>
                      )}
                    </VStack>
                  </Box>
                ))}
            </Grid>
          </>
        )}
      </Box>

      {/* Footer info */}
      <Box mt={8} p={4} bg={cardBg} borderRadius="lg" textAlign="center">
        <Text fontSize="sm" color="gray.600">
          🎉 Chúc mừng kỷ niệm 15 năm thành lập CLB BK-AUTO! 🎉
        </Text>
      </Box>
    </Container>
  );
};

export default StatisticsPage;
