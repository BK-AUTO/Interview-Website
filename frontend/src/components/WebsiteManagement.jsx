import React from 'react';
import { Container, Text, Button, VStack } from '@chakra-ui/react';

const WebsiteManagement = ({ setActiveTab }) => {
  const handleManageUsers = () => {
    setActiveTab(0); // Switch to the "Member Management" tab
  };

  return (
    <Container maxW={'2000px'} my={4} borderRadius="md">
      <Text
        fontSize={{ base: '3xl', md: '50' }}
        fontWeight={'bold'}
        letterSpacing={'2px'}
        textTransform={'uppercase'}
        textAlign={'center'}
        mb={8}
        borderRadius="md"
      >
        <Text
          as={'span'}
          bgGradient={'linear(to-r, pink.400, purple.500)'}
          bgClip={'text'}
        >
          Website Management
        </Text>
      </Text>
      <VStack spacing={4} borderRadius="md">
        <Button colorScheme="teal" onClick={handleManageUsers} borderRadius="md">Manage Users</Button>
        <Button colorScheme="teal" borderRadius="md">Manage Content</Button>
        <Button colorScheme="teal" borderRadius="md">Settings</Button>
      </VStack>
    </Container>
  );
};

export default WebsiteManagement;
