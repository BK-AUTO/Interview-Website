import { Box, Button, Container, Flex, Text, useColorMode, useColorModeValue, HStack } from "@chakra-ui/react";
import { IoMoon } from "react-icons/io5";
import { LuSun } from "react-icons/lu";
import { ViewIcon, ArrowBackIcon } from "@chakra-ui/icons";
import Checkin from "./Checkin";

const Navbar = ({ currentView, onViewStatistics, onBackToCheckin, onBackToSelection }) => {
  const { colorMode, toggleColorMode } = useColorMode();
  
  return (
    <Container maxW={"1400px"}>
      <Box 
        px={6} 
        my={4} 
        borderRadius={12} 
        bg={useColorModeValue("linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)", "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)")}
        bgGradient={useColorModeValue("linear(to-r, orange.400, orange.500)", "linear(to-r, gray.700, gray.800)")}
        boxShadow="lg"
      >
        <Flex h='16' alignItems={"center"} justifyContent={"space-between"}>
          {/* Left side - Logo */}
          <Flex
            alignItems={"center"}
            justifyContent={"center"}
            gap={3}
            display={{ base: "none", sm: "flex" }}
          >
            <img src='/logobkauto.png' alt='BK-AUTO logo' width={180} height={180} />
          </Flex>
          
          {/* Center - Title & Navigation */}
          <HStack spacing={4}>
            <Text 
              fontSize={{ base: "md", md: "xl" }}
              fontWeight="bold"
              color="white"
              textShadow="1px 1px 2px rgba(0,0,0,0.3)"
              display={{ base: "none", md: "block" }}
            >
              🎉 BK-AUTO YEP 2025 - Year End Party 🎉
            </Text>
            
            {currentView && (
              <Button
                leftIcon={<ArrowBackIcon />}
                colorScheme="whiteAlpha"
                variant="outline"
                size="sm"
                onClick={onBackToSelection}
                _hover={{ bg: 'whiteAlpha.200' }}
              >
                Chọn giao diện
              </Button>
            )}
            
            {currentView === 'checkin' && (
              <Button
                leftIcon={<ViewIcon />}
                colorScheme="whiteAlpha"
                variant="solid"
                size="sm"
                onClick={onViewStatistics}
                bg="whiteAlpha.300"
                _hover={{ bg: 'whiteAlpha.400' }}
              >
                📊 Thống kê
              </Button>
            )}
            
            {currentView === 'statistics' && (
              <Button
                colorScheme="whiteAlpha"
                variant="solid"
                size="sm"
                onClick={onBackToCheckin}
                bg="whiteAlpha.300"
                _hover={{ bg: 'whiteAlpha.400' }}
              >
                📋 Check-in
              </Button>
            )}
          </HStack>

          {/* Right side */}
          <Flex gap={3} alignItems={"center"}>
            <Text 
              fontSize={"sm"} 
              fontWeight={600} 
              display={{ base: "none", lg: "block" }}
              color="white"
              bg="whiteAlpha.200"
              px={3}
              py={1}
              borderRadius="full"
            >
              {currentView === 'checkin' ? '📋 Check-in' : 
               currentView === 'statistics' ? '📊 Thống kê' : 
               '🎊 YEP 2025'}
            </Text>

            <Button 
              onClick={toggleColorMode}
              colorScheme="whiteAlpha"
              variant="ghost"
              _hover={{ bg: 'whiteAlpha.200' }}
            >
              {colorMode === "light" ? <IoMoon color="white" /> : <LuSun size={20} color="white" />}
            </Button>
            {currentView === 'checkin' && <Checkin />}                       
          </Flex>
        </Flex>
      </Box>
    </Container>
  );
};
export default Navbar;
