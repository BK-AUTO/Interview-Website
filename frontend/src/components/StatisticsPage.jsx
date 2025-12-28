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
  Progress,
  SimpleGrid,
  Flex
} from '@chakra-ui/react';

const StatisticsPage = ({ members = [] }) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const orangeBg = useColorModeValue('orange.50', 'orange.900');

  // Tính toán thống kê cơ bản
  const totalMembers = members.length;
  const checkedInMembers = members.filter(m => m.state === 'Đã checkin').length;
  const ceremonyChecked = members.filter(m => m.checkin_ceremony).length;
  const partyChecked = members.filter(m => m.checkin_party).length;
  const checkinRate = totalMembers > 0 ? ((checkedInMembers / totalMembers) * 100).toFixed(1) : 0;

  // Thống kê theo loại thành viên
  const csvMembers = members.filter(m => m.member_type === 'CSV');
  const currentMembers = members.filter(m => m.member_type === 'CURRENT');
  const csvCheckedIn = csvMembers.filter(m => m.state === 'Đã checkin').length;
  const currentCheckedIn = currentMembers.filter(m => m.state === 'Đã checkin').length;

  // Thống kê theo khóa
  const khoaStats = members.reduce((acc, member) => {
    const khoa = member.khoa || 'Không xác định';
    if (!acc[khoa]) {
      acc[khoa] = { total: 0, checkedIn: 0, ceremony: 0, party: 0 };
    }
    acc[khoa].total++;
    if (member.state === 'Đã checkin') acc[khoa].checkedIn++;
    if (member.checkin_ceremony) acc[khoa].ceremony++;
    if (member.checkin_party) acc[khoa].party++;
    return acc;
  }, {});

  // Thống kê theo phần tham gia
  const participationStats = members.reduce((acc, member) => {
    const ptype = member.participation_type || 'Không xác định';
    if (!acc[ptype]) {
      acc[ptype] = { total: 0, checkedIn: 0, ceremony: 0, party: 0 };
    }
    acc[ptype].total++;
    if (member.state === 'Đã checkin') acc[ptype].checkedIn++;
    if (member.checkin_ceremony) acc[ptype].ceremony++;
    if (member.checkin_party) acc[ptype].party++;
    return acc;
  }, {});

  // Sort khoa by natural order (K61, K62, ..., K70, NCS)
  const sortedKhoa = Object.entries(khoaStats).sort(([a], [b]) => {
    if (a === 'NCS') return 1;
    if (b === 'NCS') return -1;
    if (a === 'Không xác định') return 1;
    if (b === 'Không xác định') return -1;
    const numA = parseInt(a.replace('K', '')) || 0;
    const numB = parseInt(b.replace('K', '')) || 0;
    return numA - numB;
  });

  const StatCard = ({ title, data, colorScheme = 'orange' }) => (
    <Box
      p={6}
      bg={cardBg}
      border="2px"
      borderColor={`${colorScheme}.200`}
      borderRadius="xl"
      shadow="lg"
      _hover={{ shadow: 'xl', transform: 'translateY(-2px)' }}
      transition="all 0.2s"
    >
      <Text fontSize="lg" fontWeight="bold" mb={4} color={`${colorScheme}.500`}>
        {title}
      </Text>
      <VStack spacing={3} align="stretch">
        {data.map(([key, stats]) => {
          const rate = stats.total > 0 ? (stats.checkedIn / stats.total) * 100 : 0;
          return (
            <Box key={key}>
              <HStack justify="space-between" mb={1}>
                <Text fontSize="sm" fontWeight="medium" noOfLines={1} flex={1}>
                  {key}
                </Text>
                <HStack spacing={2}>
                  <Badge colorScheme="green" variant="solid">
                    {stats.checkedIn}
                  </Badge>
                  <Text fontSize="sm" color="gray.500">
                    /{stats.total}
                  </Text>
                  <Text fontSize="xs" color="gray.400" minW="35px" textAlign="right">
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
    <Container maxW="7xl" py={6}>
      {/* Header */}
      <Box 
        mb={8} 
        p={6} 
        bg={orangeBg}
        borderRadius="2xl"
        border="2px"
        borderColor="orange.200"
        textAlign="center"
      >
        <Text fontSize="3xl" fontWeight="bold" color="orange.600">
          📊 Thống Kê Sự Kiện YEP 2025
        </Text>
        <Text fontSize="md" color="gray.600" mt={2}>
          BK-AUTO Year End Party - Cập nhật realtime
        </Text>
      </Box>

      {/* Thống kê tổng quan */}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={6} mb={8}>
        <Stat
          p={5}
          bg={bgColor}
          border="3px"
          borderColor="blue.300"
          borderRadius="xl"
          shadow="lg"
          textAlign="center"
        >
          <StatLabel fontSize="sm" color="gray.600">Tổng Đăng Ký</StatLabel>
          <StatNumber fontSize="4xl" color="blue.500" fontWeight="bold">
            {totalMembers}
          </StatNumber>
          <StatHelpText fontSize="xs">thành viên</StatHelpText>
        </Stat>
        
        <Stat
          p={5}
          bg={bgColor}
          border="3px"
          borderColor="green.300"
          borderRadius="xl"
          shadow="lg"
          textAlign="center"
        >
          <StatLabel fontSize="sm" color="gray.600">Đã Check-in</StatLabel>
          <StatNumber fontSize="4xl" color="green.500" fontWeight="bold">
            {checkedInMembers}
          </StatNumber>
          <StatHelpText fontSize="xs">
            {checkinRate}%
          </StatHelpText>
        </Stat>

        <Stat
          p={5}
          bg={bgColor}
          border="3px"
          borderColor="orange.300"
          borderRadius="xl"
          shadow="lg"
          textAlign="center"
        >
          <StatLabel fontSize="sm" color="gray.600">📜 Phần Lễ</StatLabel>
          <StatNumber fontSize="4xl" color="orange.500" fontWeight="bold">
            {ceremonyChecked}
          </StatNumber>
          <StatHelpText fontSize="xs">đã check-in</StatHelpText>
        </Stat>

        <Stat
          p={5}
          bg={bgColor}
          border="3px"
          borderColor="pink.300"
          borderRadius="xl"
          shadow="lg"
          textAlign="center"
        >
          <StatLabel fontSize="sm" color="gray.600">🎉 Phần Hội</StatLabel>
          <StatNumber fontSize="4xl" color="pink.500" fontWeight="bold">
            {partyChecked}
          </StatNumber>
          <StatHelpText fontSize="xs">đã check-in</StatHelpText>
        </Stat>
      </SimpleGrid>

      {/* Progress Bar tổng */}
      <Box mb={8} p={6} bg={cardBg} borderRadius="xl" shadow="md">
        <HStack justify="space-between" mb={3}>
          <Text fontWeight="bold" color="gray.700">Tiến độ Check-in</Text>
          <Text fontWeight="bold" color="green.500">{checkedInMembers}/{totalMembers}</Text>
        </HStack>
        <Progress 
          value={parseFloat(checkinRate)} 
          size="lg" 
          colorScheme="green" 
          borderRadius="full"
          hasStripe
          isAnimated
        />
      </Box>

      {/* Thống kê CSV vs SV hiện tại */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={8}>
        <Box
          p={6}
          bg={cardBg}
          border="2px"
          borderColor="purple.200"
          borderRadius="xl"
          shadow="lg"
        >
          <Text fontSize="lg" fontWeight="bold" mb={4} color="purple.500">
            👥 Cựu Sinh Viên (CSV)
          </Text>
          <HStack justify="space-between" mb={2}>
            <Text>Tổng số:</Text>
            <Badge colorScheme="purple" fontSize="lg" px={3}>{csvMembers.length}</Badge>
          </HStack>
          <HStack justify="space-between" mb={3}>
            <Text>Đã check-in:</Text>
            <Badge colorScheme="green" fontSize="lg" px={3}>{csvCheckedIn}</Badge>
          </HStack>
          <Progress 
            value={csvMembers.length > 0 ? (csvCheckedIn / csvMembers.length) * 100 : 0} 
            colorScheme="purple"
            borderRadius="full"
          />
        </Box>

        <Box
          p={6}
          bg={cardBg}
          border="2px"
          borderColor="blue.200"
          borderRadius="xl"
          shadow="lg"
        >
          <Text fontSize="lg" fontWeight="bold" mb={4} color="blue.500">
            🎓 Sinh Viên Hiện Tại
          </Text>
          <HStack justify="space-between" mb={2}>
            <Text>Tổng số:</Text>
            <Badge colorScheme="blue" fontSize="lg" px={3}>{currentMembers.length}</Badge>
          </HStack>
          <HStack justify="space-between" mb={3}>
            <Text>Đã check-in:</Text>
            <Badge colorScheme="green" fontSize="lg" px={3}>{currentCheckedIn}</Badge>
          </HStack>
          <Progress 
            value={currentMembers.length > 0 ? (currentCheckedIn / currentMembers.length) * 100 : 0} 
            colorScheme="blue"
            borderRadius="full"
          />
        </Box>
      </SimpleGrid>

      <Divider mb={8} />

      {/* Thống kê chi tiết */}
      <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap={6} mb={8}>
        <GridItem>
          <StatCard 
            title="🎓 Thống Kê Theo Khóa" 
            data={sortedKhoa}
            colorScheme="teal"
          />
        </GridItem>
        
        <GridItem>
          <StatCard 
            title="🎪 Thống Kê Theo Phần Tham Gia" 
            data={Object.entries(participationStats).sort(([,a], [,b]) => b.total - a.total)}
            colorScheme="orange"
          />
        </GridItem>
      </Grid>

      <Divider mb={8} />

      {/* Danh sách đã check-in */}
      <Box
        p={6}
        bg={cardBg}
        border="2px"
        borderColor="green.200"
        borderRadius="xl"
        shadow="lg"
        mb={8}
      >
        <Text fontSize="2xl" fontWeight="bold" mb={6} color="green.600" textAlign="center">
          ✅ Danh Sách Đã Check-in ({checkedInMembers} người)
        </Text>
        
        {checkedInMembers === 0 ? (
          <Box textAlign="center" py={8}>
            <Text color="gray.500" fontStyle="italic" fontSize="lg">
              Chưa có thành viên nào check-in
            </Text>
          </Box>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
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
                    borderColor: 'green.400'
                  }}
                  transition="all 0.2s"
                >
                  <Flex justify="space-between" align="start" mb={2}>
                    <Text fontWeight="bold" color="green.700" fontSize="md">
                      {member.name}
                    </Text>
                    <Badge colorScheme="teal" fontSize="sm">
                      {member.khoa || 'N/A'}
                    </Badge>
                  </Flex>
                  
                  <HStack spacing={2} mb={2} flexWrap="wrap">
                    {member.member_type === 'CSV' ? (
                      <Badge colorScheme="purple" fontSize="xs">Cựu SV</Badge>
                    ) : (
                      <Badge colorScheme="blue" fontSize="xs">Sinh viên</Badge>
                    )}
                    {member.MSSV && (
                      <Text fontSize="xs" color="gray.500">{member.MSSV}</Text>
                    )}
                  </HStack>

                  <HStack spacing={2}>
                    {member.checkin_ceremony && (
                      <Badge colorScheme="orange" variant="solid" fontSize="xs">📜 Lễ</Badge>
                    )}
                    {member.checkin_party && (
                      <Badge colorScheme="pink" variant="solid" fontSize="xs">🎉 Hội</Badge>
                    )}
                  </HStack>
                  
                  {member.checkin_time && (
                    <Text fontSize="xs" color="gray.500" mt={2}>
                      ⏰ {new Date(member.checkin_time).toLocaleString('vi-VN', {
                        timeZone: 'Asia/Ho_Chi_Minh',
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      })}
                    </Text>
                  )}
                </Box>
              ))}
          </SimpleGrid>
        )}
      </Box>

      {/* Footer */}
      <Box mt={8} p={4} bg={orangeBg} borderRadius="lg" textAlign="center">
        <Text fontSize="md" color="orange.600" fontWeight="bold">
          🎉 BK-AUTO YEP 2025 - Year End Party 🎉
        </Text>
      </Box>
    </Container>
  );
};

export default StatisticsPage;
