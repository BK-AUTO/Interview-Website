import React, { useMemo } from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  Badge,
  HStack,
  VStack,
  SimpleGrid,
  Divider,
} from '@chakra-ui/react';
import { FaChartBar, FaBullhorn, FaMicrophoneAlt } from 'react-icons/fa';
import { DEPARTMENT_LABELS } from '../config';

const InterviewTracker = ({ members = [] }) => {
  // Extract members in active interview flow ('Đang phỏng vấn' or 'Gọi PV')
  const activeInterviewees = useMemo(() => {
    return members.filter(
      (m) => m.state === 'Đang phỏng vấn' || m.state === 'Gọi PV'
    );
  }, [members]);

  const inInterviewCount = useMemo(
    () => activeInterviewees.filter((m) => m.state === 'Đang phỏng vấn').length,
    [activeInterviewees]
  );

  const callingCount = useMemo(
    () => activeInterviewees.filter((m) => m.state === 'Gọi PV').length,
    [activeInterviewees]
  );

  // Group active interviewees by specialist/department
  const groupedBySpecialist = useMemo(() => {
    const map = {};
    activeInterviewees.forEach((member) => {
      const spec = DEPARTMENT_LABELS[member.specialist] || member.specialist || 'Chung / Chưa phân mảng';
      if (!map[spec]) map[spec] = [];
      map[spec].push(member);
    });
    return map;
  }, [activeInterviewees]);

  return (
    <Box pb={8}>
      {/* Page Title & Live Badge */}
      <Flex justify="space-between" align={{ base: 'flex-start', sm: 'center' }} mb={6} flexWrap="wrap" gap={3}>
        <HStack spacing={3}>
          <Box p={2} borderRadius="lg" bg="rgba(114, 46, 209, 0.15)" color="secondary.500">
            <FaChartBar size={20} />
          </Box>
          <Box>
            <Heading fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color="gray.900">
              Bảng theo dõi phỏng vấn trực tiếp
            </Heading>
            <Text fontSize="xs" color="gray.500">
              Cập nhật thời gian thực các phòng phỏng vấn và ứng viên đang trong lượt
            </Text>
          </Box>
        </HStack>

        <HStack spacing={2} p={2} px={3} borderRadius="full" bg="white" borderWidth="1px" borderColor="gray.200">
          <Box w="8px" h="8px" borderRadius="full" bg="primary.500" className="live-pulse" />
          <Text fontSize="xs" fontWeight="bold" color="primary.600" textTransform="uppercase" letterSpacing="0.05em">
            Live Updates
          </Text>
        </HStack>
      </Flex>

      {/* KPI Stat Cards */}
      <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4} mb={6}>
        <Box p={4} borderRadius="xl" bg="white" borderWidth="1px" borderColor="gray.200">
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="0.05em">
                Đang trong phòng phỏng vấn
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="secondary.500" mt={1}>
                {inInterviewCount} ứng viên
              </Text>
            </Box>
            <Box p={3} borderRadius="xl" bg="rgba(114, 46, 209, 0.15)" color="secondary.500">
              <FaMicrophoneAlt size={20} />
            </Box>
          </Flex>
        </Box>

        <Box p={4} borderRadius="xl" bg="white" borderWidth="1px" borderColor="gray.200">
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="0.05em">
                Đang được gọi vào phòng
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="warning.600" mt={1}>
                {callingCount} ứng viên
              </Text>
            </Box>
            <Box p={3} borderRadius="xl" bg="rgba(250, 173, 20, 0.15)" color="warning.600">
              <FaBullhorn size={20} />
            </Box>
          </Flex>
        </Box>
      </SimpleGrid>

      {/* Active Interviews by Department */}
      {activeInterviewees.length === 0 ? (
        <Box textAlign="center" py={16} bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl">
          <Box as={FaChartBar} boxSize={12} color="gray.200" mx="auto" mb={3} />
          <Text fontSize="md" fontWeight="medium" color="gray.600">
            Hiện tại không có lượt phỏng vấn nào đang diễn ra
          </Text>
          <Text fontSize="xs" color="gray.300" mt={1}>
            Khi admin bấm &ldquo;Gọi PV&rdquo; từ tab Quản lý ứng viên, danh sách sẽ hiển thị tự động tại đây
          </Text>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {Object.entries(groupedBySpecialist).map(([dept, candidates]) => (
            <Box
              key={dept}
              p={5}
              borderRadius="xl"
              bg="white"
              borderWidth="1px"
              borderColor="gray.200"
              display="flex"
              flexDirection="column"
            >
              <Flex justify="space-between" align="center" mb={4}>
                <Heading fontSize="sm" fontWeight="bold" color="gray.900" textTransform="uppercase" letterSpacing="0.05em">
                  {dept}
                </Heading>
                <Badge bg="gray.100" color="gray.600" fontSize="11px" px={2} py={0.5} borderRadius="full">
                  {candidates.length} người
                </Badge>
              </Flex>

              <Divider borderColor="gray.200" mb={4} />

              <VStack spacing={3} align="stretch" flex="1">
                {candidates.map((candidate) => {
                  const isInInterview = candidate.state === 'Đang phỏng vấn';

                  return (
                    <Box
                      key={candidate.id}
                      p={3.5}
                      borderRadius="lg"
                      bg={isInInterview ? 'rgba(114, 46, 209, 0.06)' : 'gray.50'}
                      border="1px solid"
                      borderColor={isInInterview ? 'rgba(114, 46, 209, 0.3)' : 'gray.200'}
                      position="relative"
                      overflow="hidden"
                    >
                      {isInInterview && (
                        <Box
                          position="absolute"
                          top={0}
                          left={0}
                          bottom={0}
                          w="3px"
                          bg="secondary.500"
                        />
                      )}

                      <Flex justify="space-between" align="flex-start">
                        <Box pl={isInInterview ? 1.5 : 0}>
                          <Text fontWeight="bold" color="gray.900" fontSize="sm">
                            {candidate.name}
                          </Text>
                          <Text fontSize="xs" color="primary.600" fontFamily="mono">
                            {candidate.MSSV}
                          </Text>
                          {candidate.major_class && (
                            <Text fontSize="11px" color="gray.400" mt={0.5}>
                              {candidate.major_class}
                            </Text>
                          )}
                        </Box>

                        <Badge
                          bg={isInInterview ? 'rgba(114, 46, 209, 0.15)' : 'rgba(250, 173, 20, 0.15)'}
                          color={isInInterview ? 'secondary.600' : 'warning.700'}
                          border="1px solid"
                          borderColor={isInInterview ? 'rgba(114, 46, 209, 0.4)' : 'rgba(250, 173, 20, 0.4)'}
                          fontSize="xs"
                          px={2}
                          py={0.5}
                        >
                          {candidate.state}
                        </Badge>
                      </Flex>
                    </Box>
                  );
                })}
              </VStack>
            </Box>
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
};

export default InterviewTracker;
