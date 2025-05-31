import React from 'react';
import {
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
  Divider
} from '@chakra-ui/react';

const Statistics = ({ members = [] }) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

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
      p={4}
      bg={bgColor}
      border="1px"
      borderColor={borderColor}
      borderRadius="lg"
      shadow="sm"
    >
      <Text fontSize="lg" fontWeight="bold" mb={3} color={`${colorScheme}.500`}>
        {title}
      </Text>
      <VStack spacing={2} align="stretch">
        {Object.entries(data)
          .sort(([,a], [,b]) => b.total - a.total)
          .slice(0, 5)
          .map(([key, stats]) => (
            <HStack key={key} justify="space-between">
              <Text fontSize="sm" noOfLines={1} flex={1}>
                {key}
              </Text>
              <HStack spacing={2}>
                <Badge colorScheme="green" variant="subtle">
                  {stats.checkedIn}
                </Badge>
                <Text fontSize="sm" color="gray.500">
                  /{stats.total}
                </Text>
              </HStack>
            </HStack>
          ))}
      </VStack>
    </Box>
  );

  return (
    <Box mb={6}>
      {/* Header với thống kê tổng */}
      <Text
        fontSize={'4xl'}
        fontWeight={700}
        textTransform={'uppercase'}
        textAlign={'center'}
        mb={6}
      >
        <Text
          as={'span'}
          bgGradient={'linear(to-r, pink.400, purple.500)'}
          bgClip={'text'}
        >
          Thống Kê Kỷ Niệm 15 Năm BK-AUTO tham gia
        </Text>
      </Text>

      {/* Thống kê tổng quan */}
      <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={6} mb={6}>
        <GridItem>
          <Stat
            p={4}
            bg={bgColor}
            border="1px"
            borderColor={borderColor}
            borderRadius="lg"
            shadow="sm"
            textAlign="center"
          >
            <StatLabel>Tổng Thành Viên</StatLabel>
            <StatNumber color="blue.500">{totalMembers}</StatNumber>
            <StatHelpText>Đã đăng ký tham dự</StatHelpText>
          </Stat>
        </GridItem>
        
        <GridItem>
          <Stat
            p={4}
            bg={bgColor}
            border="1px"
            borderColor={borderColor}
            borderRadius="lg"
            shadow="sm"
            textAlign="center"
          >
            <StatLabel>Đã Check-in</StatLabel>
            <StatNumber color="green.500">{checkedInMembers}</StatNumber>
            <StatHelpText>Tỷ lệ: {checkinRate}%</StatHelpText>
          </Stat>
        </GridItem>

        <GridItem>
          <Stat
            p={4}
            bg={bgColor}
            border="1px"
            borderColor={borderColor}
            borderRadius="lg"
            shadow="sm"
            textAlign="center"
          >
            <StatLabel>Chưa Check-in</StatLabel>
            <StatNumber color="orange.500">{totalMembers - checkedInMembers}</StatNumber>
            <StatHelpText>Còn lại</StatHelpText>
          </Stat>
        </GridItem>
      </Grid>

      <Divider mb={6} />

      {/* Thống kê chi tiết */}
      <Grid templateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap={6} mb={8}>
        <GridItem>
          <StatCard 
            title="Theo Tổ Chức" 
            data={organizationStats} 
            colorScheme="green"
          />
        </GridItem>
        
        <GridItem>
          <StatCard 
            title="Theo Vai Trò Cũ" 
            data={roleStats} 
            colorScheme="orange"
          />
        </GridItem>
      </Grid>

      <Divider mb={6} />

      {/* Danh sách cựu thành viên đã tham dự */}
      <Box
        p={6}
        bg={bgColor}
        border="1px"
        borderColor={borderColor}
        borderRadius="lg"
        shadow="sm"
      >
        <Text fontSize="2xl" fontWeight="bold" mb={4} color="purple.500">
          Danh Sách Cựu Thành Viên Đã Tham Dự
        </Text>
        
        {checkedInMembers === 0 ? (
          <Text color="gray.500" fontStyle="italic">
            Chưa có thành viên nào check-in
          </Text>
        ) : (
          <Grid templateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap={4}>
            {members
              .filter(member => member.state === 'Đã checkin')
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((member, index) => (
                <Box
                  key={member.id || index}
                  p={4}
                  border="1px"
                  borderColor="green.200"
                  borderRadius="md"
                  bg="green.50"
                >
                  <VStack spacing={2} align="start">
                    <HStack justify="space-between" w="100%">
                      <Text fontWeight="bold" color="green.700">
                        {member.name}
                      </Text>
                      <Badge colorScheme="green" fontSize="xs">
                        Số {member.lottery_number || 'N/A'}
                      </Badge>
                    </HStack>
                    
                    <Text fontSize="sm" color="gray.600">
                      MSSV: {member.MSSV || 'N/A'}
                    </Text>
                    
                    <HStack spacing={2} wrap="wrap">
                      <Badge colorScheme="blue" fontSize="xs">
                        {member.organization || 'N/A'}
                      </Badge>
                      <Badge colorScheme="purple" fontSize="xs">
                        {member.former_role || 'N/A'}
                      </Badge>
                    </HStack>
                    
                    {member.checkin_time && (
                      <Text fontSize="xs" color="gray.500">
                        Check-in: {new Date(member.checkin_time).toLocaleString('vi-VN', {
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
        )}
      </Box>
    </Box>
  );
};

export default Statistics;
