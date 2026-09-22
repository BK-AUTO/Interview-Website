import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import { FaChartBar, FaBullhorn, FaMicrophoneAlt, FaMapMarkerAlt, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';
import { getMemberActiveInterviewSessions } from '../config';
import useInterviewCallChime from '../hooks/useInterviewCallChime';

const MUTE_STORAGE_KEY = 'interviewTracker:muted';

const TableBadge = ({ table, size = 'sm' }) => {
  if (!table) return null;
  const isLarge = size === 'lg';
  return (
    <HStack
      spacing={1.5}
      bg="rgba(250, 173, 20, 0.12)"
      border="1px solid"
      borderColor="rgba(250, 173, 20, 0.4)"
      color="warning.700"
      borderRadius="lg"
      px={isLarge ? 3 : 1.5}
      py={isLarge ? 1 : 0.5}
    >
      <FaMapMarkerAlt size={isLarge ? 14 : 9} />
      <Text fontSize={isLarge ? 'md' : '10px'} fontWeight="bold">
        {table}
      </Text>
    </HStack>
  );
};

const CallingCard = ({ session }) => (
  <Box
    className="call-pulse-card"
    p={5}
    borderRadius="xl"
    bg="white"
    borderWidth="2px"
    borderColor="rgba(250, 173, 20, 0.5)"
    position="relative"
    overflow="hidden"
  >
    <Flex justify="space-between" align="flex-start" mb={3}>
      <HStack spacing={1.5}>
        <Box w="7px" h="7px" borderRadius="full" bg="warning.500" className="call-badge-pulse" />
        <Text fontSize="10px" fontWeight="bold" color="warning.700" textTransform="uppercase" letterSpacing="0.08em">
          Đang gọi
        </Text>
      </HStack>
      {session.isSubDept ? (
        <Badge colorScheme="purple" fontSize="10px" px={1.5} py={0.5} borderRadius="md">
          Mảng phụ
        </Badge>
      ) : (
        <Badge colorScheme="green" fontSize="10px" px={1.5} py={0.5} borderRadius="md">
          Mảng chính
        </Badge>
      )}
    </Flex>

    <Text fontWeight="bold" color="gray.900" fontSize="md" noOfLines={1}>
      {session.candidateName}
    </Text>
    <Text fontSize="xs" color="primary.600" fontFamily="mono" mt={0.5}>
      {session.candidateMSSV}
    </Text>
    <Text fontSize="11px" color="gray.400" mt={0.5} noOfLines={1}>
      {session.deptLabel}
    </Text>

    <Divider my={3} borderColor="rgba(250, 173, 20, 0.25)" />

    {session.table ? (
      <VStack align="flex-start" spacing={0.5}>
        <Text fontSize="10px" color="gray.400" textTransform="uppercase" letterSpacing="0.05em">
          Mời vào
        </Text>
        <HStack spacing={2} color="warning.700">
          <FaMapMarkerAlt size={18} />
          <Text fontSize="3xl" fontWeight="black" lineHeight="1.1">
            {session.table}
          </Text>
        </HStack>
      </VStack>
    ) : (
      <Text fontSize="sm" color="gray.400" fontStyle="italic">
        Chưa xếp số bàn
      </Text>
    )}
  </Box>
);

const InterviewTracker = ({ members = [] }) => {
  const [isMuted, setIsMuted] = useState(() => {
    try {
      return localStorage.getItem(MUTE_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const playChime = useInterviewCallChime();
  const seenCallingKeysRef = useRef(new Set());
  const isFirstRunRef = useRef(true);

  // Extract all active interview sessions (both Main Department and Sub-Departments)
  const activeSessions = useMemo(() => {
    return members.flatMap(getMemberActiveInterviewSessions);
  }, [members]);

  const callingSessions = useMemo(
    () => activeSessions.filter((s) => s.state === 'Gọi PV'),
    [activeSessions]
  );

  const inProgressSessions = useMemo(
    () => activeSessions.filter((s) => s.state === 'Đang phỏng vấn'),
    [activeSessions]
  );

  const inInterviewCount = inProgressSessions.length;
  const callingCount = callingSessions.length;

  // Sound a chime whenever a session newly enters 'Gọi PV'. Diffing against
  // the previously-seen key set (rather than just "count changed") means a
  // simultaneous call+finish doesn't cancel itself out, and a page
  // refresh/SSE resync doesn't re-announce calls that were already active.
  useEffect(() => {
    const currentKeys = new Set(callingSessions.map((s) => s.uniqueKey));
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
    } else {
      let hasNew = false;
      currentKeys.forEach((key) => {
        if (!seenCallingKeysRef.current.has(key)) hasNew = true;
      });
      if (hasNew && !isMuted) playChime();
    }
    seenCallingKeysRef.current = currentKeys;
  }, [callingSessions, isMuted, playChime]);

  const toggleMuted = () => {
    setIsMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(MUTE_STORAGE_KEY, next ? '1' : '0');
      } catch {
        // ignore (private browsing / blocked storage)
      }
      return next;
    });
  };

  // Group in-progress sessions by department for the compact grid below the
  // calling hero section
  const groupedInProgress = useMemo(() => {
    const map = {};
    inProgressSessions.forEach((session) => {
      const dept = session.deptLabel;
      if (!map[dept]) map[dept] = [];
      map[dept].push(session);
    });
    return map;
  }, [inProgressSessions]);

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
              Cập nhật thời gian thực các phòng phỏng vấn mảng chính & mảng phụ
            </Text>
          </Box>
        </HStack>

        <HStack spacing={2}>
          <Tooltip label={isMuted ? 'Bật âm báo gọi phỏng vấn' : 'Tắt âm báo gọi phỏng vấn'} hasArrow>
            <IconButton
              aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              icon={isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
              size="sm"
              variant="outline"
              colorScheme={isMuted ? 'gray' : 'warning'}
              borderRadius="full"
              onClick={toggleMuted}
            />
          </Tooltip>
          <HStack spacing={2} p={2} px={3} borderRadius="full" bg="white" borderWidth="1px" borderColor="gray.200">
            <Box w="8px" h="8px" borderRadius="full" bg="primary.500" className="live-pulse" />
            <Text fontSize="xs" fontWeight="bold" color="primary.600" textTransform="uppercase" letterSpacing="0.05em">
              Live Updates
            </Text>
          </HStack>
        </HStack>
      </Flex>

      {/* KPI Stat Cards */}
      <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4} mb={6}>
        <Box p={4} borderRadius="xl" bg="white" borderWidth="1px" borderColor="gray.200">
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="0.05em">
                Đang được gọi vào phòng
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="warning.600" mt={1}>
                {callingCount} lượt
              </Text>
            </Box>
            <Box p={3} borderRadius="xl" bg="rgba(250, 173, 20, 0.15)" color="warning.600">
              <FaBullhorn size={20} />
            </Box>
          </Flex>
        </Box>

        <Box p={4} borderRadius="xl" bg="white" borderWidth="1px" borderColor="gray.200">
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="0.05em">
                Đang trong phòng phỏng vấn
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="secondary.500" mt={1}>
                {inInterviewCount} lượt
              </Text>
            </Box>
            <Box p={3} borderRadius="xl" bg="rgba(114, 46, 209, 0.15)" color="secondary.500">
              <FaMicrophoneAlt size={20} />
            </Box>
          </Flex>
        </Box>
      </SimpleGrid>

      {/* Calling hero section — the primary "queue board" surface */}
      {callingCount > 0 && (
        <Box mb={6}>
          <HStack spacing={2} mb={3}>
            <FaBullhorn color="var(--chakra-colors-warning-600)" />
            <Heading fontSize="sm" fontWeight="bold" color="gray.900" textTransform="uppercase" letterSpacing="0.05em">
              Đang gọi vào phòng phỏng vấn
            </Heading>
          </HStack>
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={4}>
            {callingSessions.map((session) => (
              <CallingCard key={session.uniqueKey} session={session} />
            ))}
          </SimpleGrid>
        </Box>
      )}

      {/* In-progress sessions grouped by department */}
      {activeSessions.length === 0 ? (
        <Box textAlign="center" py={16} bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl">
          <Box as={FaChartBar} boxSize={12} color="gray.200" mx="auto" mb={3} />
          <Text fontSize="md" fontWeight="medium" color="gray.600">
            Hiện tại không có lượt phỏng vấn nào đang diễn ra
          </Text>
          <Text fontSize="xs" color="gray.300" mt={1}>
            Khi admin bấm &ldquo;Gọi PV&rdquo; (mảng chính hoặc mảng phụ), danh sách sẽ hiển thị tự động tại đây
          </Text>
        </Box>
      ) : inProgressSessions.length > 0 ? (
        <Box>
          <Heading fontSize="sm" fontWeight="bold" color="gray.900" textTransform="uppercase" letterSpacing="0.05em" mb={3}>
            Đang phỏng vấn
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {Object.entries(groupedInProgress).map(([dept, sessions]) => (
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
                    {sessions.length} lượt
                  </Badge>
                </Flex>

                <Divider borderColor="gray.200" mb={4} />

                <VStack spacing={3} align="stretch" flex="1">
                  {sessions.map((session) => (
                    <Box
                      key={session.uniqueKey}
                      p={3.5}
                      borderRadius="lg"
                      bg="rgba(114, 46, 209, 0.06)"
                      border="1px solid"
                      borderColor="rgba(114, 46, 209, 0.3)"
                      position="relative"
                      overflow="hidden"
                    >
                      <Box position="absolute" top={0} left={0} bottom={0} w="3px" bg="secondary.500" />

                      <Flex justify="space-between" align="flex-start" gap={2} pl={1.5}>
                        <Box>
                          <HStack spacing={1.5} align="center" flexWrap="wrap">
                            <Text fontWeight="bold" color="gray.900" fontSize="sm">
                              {session.candidateName}
                            </Text>
                            {session.isSubDept ? (
                              <Badge colorScheme="purple" fontSize="10px" px={1.5} py={0.5} borderRadius="md">
                                Mảng phụ
                              </Badge>
                            ) : (
                              <Badge colorScheme="green" fontSize="10px" px={1.5} py={0.5} borderRadius="md">
                                Mảng chính
                              </Badge>
                            )}
                          </HStack>
                          <Text fontSize="xs" color="primary.600" fontFamily="mono" mt={0.5}>
                            {session.candidateMSSV}
                          </Text>
                          {session.major_class && (
                            <Text fontSize="11px" color="gray.400" mt={0.5}>
                              {session.major_class}
                            </Text>
                          )}
                        </Box>

                        <VStack spacing={1} align="flex-end">
                          <Badge
                            bg="rgba(114, 46, 209, 0.15)"
                            color="secondary.600"
                            border="1px solid"
                            borderColor="rgba(114, 46, 209, 0.4)"
                            fontSize="xs"
                            px={2}
                            py={0.5}
                            whiteSpace="nowrap"
                          >
                            {session.state}
                          </Badge>
                          <TableBadge table={session.table} />
                        </VStack>
                      </Flex>
                    </Box>
                  ))}
                </VStack>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      ) : null}
    </Box>
  );
};

export default InterviewTracker;
