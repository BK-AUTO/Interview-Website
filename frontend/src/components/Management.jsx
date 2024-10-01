import React from 'react';
import {
  Container,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';

const Management = ({ members }) => {
  return (
    <Container maxW={'2000px'} my={4}>
      <Text
        fontSize={{ base: '3xl', md: '50' }}
        fontWeight={'bold'}
        letterSpacing={'2px'}
        textTransform={'uppercase'}
        textAlign={'center'}
        mb={8}
      >
        <Text
          as={'span'}
          bgGradient={'linear(to-r, pink.400, purple.500)'}
          bgClip={'text'}
        >
          Member Management
        </Text>
      </Text>

      <Tabs>
        <TabList>
          <Tab>Members</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>UID</Th>
                  <Th>Name</Th>
                  <Th>Speciality</Th>
                  <Th>Check-in Time</Th>
                  <Th>State</Th>
                </Tr>
              </Thead>
              <Tbody>
                {members.map((member) => (
                  <Tr key={member.id}>
                    <Td>{member.uid}</Td>
                    <Td minWidth="200px">{member.name}</Td>
                    <Td>{member.speciality}</Td>
                    <Td>{member.checkin_time}</Td>
                    <Td>{member.state}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Container>
  );
};

export default Management;