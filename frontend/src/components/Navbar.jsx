import { Box, Button, Container, Flex, Text, useColorMode, useColorModeValue, HStack } from "@chakra-ui/react";
import { IoMoon } from "react-icons/io5";
import { LuSun } from "react-icons/lu";
import { ViewIcon, ArrowBackIcon } from "@chakra-ui/icons";
import Checkin from "./Checkin";

const Navbar = ({ currentView, onViewStatistics, onBackToCheckin, onBackToSelection }) => {
  const { colorMode, toggleColorMode } = useColorMode();
  
  return (
    <Container maxW={"1200px"}>
      <Box px={4} my={4} borderRadius={5} bg={useColorModeValue("gray.200", "gray.700")}>
        <Flex h='16' alignItems={"center"} justifyContent={"space-between"}>
          {/* Left side */}
          <Flex
            alignItems={"center"}
            justifyContent={"center"}
            gap={3}
            display={{ base: "none", sm: "flex" }}
          >
            <img src='/logobkauto.png' alt='BK-AUTO logo' width={200} height={200} />
          </Flex>
          
          {/* Center - Navigation */}
          <HStack spacing={3}>
            {currentView && (
              <Button
                leftIcon={<ArrowBackIcon />}
                colorScheme="gray"
                variant="outline"
                size="sm"
                onClick={onBackToSelection}
              >
                Chọn giao diện
              </Button>
            )}
            
            {currentView === 'checkin' && (
              <Button
                leftIcon={<ViewIcon />}
                colorScheme="purple"
                variant="outline"
                size="sm"
                onClick={onViewStatistics}
              >
                📊 Thống kê
              </Button>
            )}
            
            {currentView === 'statistics' && (
              <Button
                colorScheme="blue"
                variant="outline"
                size="sm"
                onClick={onBackToCheckin}
              >
                📋 Check-in
              </Button>
            )}
          </HStack>

          {/* Right side */}
          <Flex gap={3} alignItems={"center"}>
            <Text fontSize={"lg"} fontWeight={500} display={{ base: "none", md: "block" }}>
              {currentView === 'checkin' ? 'Giao diện Check-in' : 
               currentView === 'statistics' ? 'Giao diện Thống kê' : 
               'Kỷ niệm 15 năm BK-AUTO'}
            </Text>

            <Button onClick={toggleColorMode}>
              {colorMode === "light" ? <IoMoon /> : <LuSun size={20} />}
            </Button>
            {currentView === 'checkin' && <Checkin />}                       
          </Flex>
        </Flex>
      </Box>
    </Container>
  );
};
export default Navbar;