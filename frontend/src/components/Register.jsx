import { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Heading,
  useToast,
  Grid,
  GridItem,
  Image
} from '@chakra-ui/react';
import api from '../api/axios';

function Register({ setIsAuthenticated }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [MSSV, setMSSV] = useState('');
  const toast = useToast();

  const handleRegister = async () => {
    try {
      const response = await api.post('/register', {
        username,
        password,
        MSSV
      });
      toast({
        title: 'Registration successful.',
        description: response.data.message,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      setIsAuthenticated(true);
    } catch (error) {
      toast({
        title: 'Registration failed.',
        description: error.response.data.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Grid templateColumns="2fr 1fr" height="100vh">
      <GridItem>
        <Image 
          src="https://imgur.com/a/ITnnrGh" 
          alt="Register Image" 
          objectFit="cover" 
          height="100%" 
          width="100%" 
          borderRadius="lg" 
        />
      </GridItem>
      <GridItem>
        <Box maxW="md" mx="auto" mt={10}>
          <VStack spacing={4} align="stretch">
            <Heading>Register</Heading>
            <FormControl id="username">
              <FormLabel>Username</FormLabel>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </FormControl>
            <FormControl id="password">
              <FormLabel>Password</FormLabel>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormControl>
            <FormControl id="MSSV">
              <FormLabel>MSSV</FormLabel>
              <Input
                type="text"
                value={MSSV}
                onChange={(e) => setMSSV(e.target.value)}
              />
            </FormControl>
            <Button colorScheme="teal" onClick={handleRegister}>
              Register
            </Button>
          </VStack>
        </Box>
      </GridItem>
    </Grid>
  );
}

export default Register;
