import React, { useState } from 'react';
import { Box, Input, Button, Text, FormControl, FormLabel, VStack, Heading, Grid, GridItem, Image } from '@chakra-ui/react';
import api from '../api/axios';

const Login = ({ setIsAuthenticated, setIsRegistering }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      const response = await api.post('/login', { username, password });
      localStorage.setItem('token', response.data.access_token);
      setIsAuthenticated(true);
    } catch (error) {
      setError('Invalid credentials');
    }
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
          <Text
        fontSize={{ base: '3xl', md: '50' }}
        fontWeight={'bold'}
        letterSpacing={'2px'}
        textTransform={'uppercase'}
        textAlign={'center'}
        mb={8}
        borderRadius="md"
      >
        {/* <Text
          as={'span'}
          bgGradient={'linear(to-r, pink.400, purple.500)'}
          bgClip={'text'}
        >
          BK-AUTO
        </Text> */}
        <Image 
          src="https://i.imgur.com/4yX5pPH.png" 
          alt="Logo Image" 
          objectFit="cover" 
          height="80%" 
          width="80%" 
          borderRadius="lg" 
          align ="center"
        marginLeft="auto"
        marginRight="auto"
        />
      </Text>
            <Heading
            textAlign={'center'}
            fontSize={{ base: '3xl', md: '50' }}
            fontWeight={'light'}
            letterSpacing={'2px'}
            mb={8}
      
            >Login</Heading>
            <FormControl id="username">
              <FormLabel
              fontWeight = {'light'}>Username</FormLabel>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </FormControl>
            <FormControl id="password">
              <FormLabel
              fontWeight = {'light'}>
                Password
              </FormLabel>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormControl>
            {error && <Text color="red.500">{error}</Text>}
            <Button
            bgGradient={'linear(to-r, rgb(239, 215, 83), rgb(224, 55, 34))'}
            color={'white'}
            fontWeight = {'light'}  onClick={handleLogin}>
              Login
            </Button>
            <Button fontWeight = {'light'} variant="link" onClick={() => setIsRegistering(true)}>Register</Button>
          </VStack>
        </Box>
      </GridItem>
    </Grid>
  );
};

export default Login;
