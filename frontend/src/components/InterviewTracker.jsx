import React, { useMemo } from 'react';
import {
  Container,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Box,
  Badge,
  Heading,
  useColorModeValue
} from '@chakra-ui/react';

// Update to include both Gọi PV and Đang phỏng vấn states
const InterviewTracker = ({ members }) => {
  const tableHeaderBg = useColorModeValue("gray.50", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  // Extract members who are in the interview process
  const interviewingMembers = useMemo(() => {
    return members.filter(member => 
      member.state === 'Đang phỏng vấn' || member.state === 'Gọi PV'
    );
  }, [members]);

  // Group members by speciality
  const groupedBySpeciality = useMemo(() => {
    const groups = {};
    interviewingMembers.forEach(member => {
      const speciality = member.specialist || 'Unknown';
      if (!groups[speciality]) {
        groups[speciality] = [];
      }
      groups[speciality].push(member);
    });
    return groups;
  }, [interviewingMembers]);

  return (
    <Container maxW={'2000px'} my={4} display="flex" flexDirection="column" height="calc(100vh - 160px)" overflow="hidden">
      <Heading
        fontSize={{ base: '2xl', md: '3xl' }}
        fontWeight={'bold'}
        textAlign={'center'}
        mb={8}
        bgGradient={'linear(to-r, pink.400, purple.500)'}
        bgClip={'text'}
      >
        Bảng Theo Dõi Phỏng Vấn
      </Heading>

      {interviewingMembers.length === 0 ? (
        <Box 
          textAlign="center" 
          py={10}
          borderWidth="1px"
          borderRadius="lg"
          borderColor={borderColor}
        >
          <Text fontSize="xl">Không có phỏng vấn nào đang diễn ra</Text>
        </Box>
      ) : (
        <Box overflowY="auto" flex="1" borderWidth="1px" borderRadius="lg" borderColor={borderColor}>
          <Table variant="simple">
            <Thead position="sticky" top={0} bg={tableHeaderBg} zIndex={1}>
              <Tr>
                <Th>Speciality</Th>
                <Th>Status</Th>
                <Th>Member Name</Th>
              </Tr>
            </Thead>
            <Tbody>
              {Object.entries(groupedBySpeciality).map(([speciality, members]) => (
                members.map((member, idx) => (
                  <Tr key={member.id}>
                    {idx === 0 ? (
                      <Td rowSpan={members.length} verticalAlign="top">
                        <Text fontWeight="bold">{speciality}</Text>
                      </Td>
                    ) : null}
                    <Td>
                      <Badge colorScheme={member.state === 'Gọi PV' ? 'blue' : 'red'}>
                        {member.state}
                      </Badge>
                    </Td>
                    <Td>
                      <Text fontWeight="medium">{member.name}</Text>
                      <Text fontSize="sm" color="gray.500">{member.MSSV}</Text>
                    </Td>
                  </Tr>
                ))
              ))}
            </Tbody>
          </Table>
        </Box>
      )}
    </Container>
  );
};

export default InterviewTracker;
