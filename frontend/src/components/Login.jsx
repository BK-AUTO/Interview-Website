import React from 'react';
import { Box, Button, Image, Grid, GridItem, Heading, VStack } from '@chakra-ui/react';

// Removed all login/register form logic temporarily
const Login = ({ setIsAuthenticated }) => {
  const handleContinue = () => {
    setIsAuthenticated(true);
  };

  return (
    <Grid templateColumns="2fr 1fr" height="100vh">
      <GridItem>
        <Image 
          src="https://i.imgur.com/HZ4Hagx.jpg" 
          alt="Login Image" 
          objectFit="cover" 
          height="100%" 
          width="100%" 
          borderRadius="lg" 
        />
      </GridItem>
      <GridItem>
        <Box maxW="md" mx="auto" mt={10}>
          <VStack spacing={4} align="stretch">
            <Heading
              textAlign="center"
              fontSize={{ base: '3xl', md: '50' }}
              fontWeight="light"
              letterSpacing="2px"
              mb={8}
            >
              Continue
            </Heading>
            <Button colorScheme="blue" onClick={handleContinue}>
              Continue
            </Button>
          </VStack>
        </Box>
      </GridItem>
    </Grid>
  );
};

export default Login;
