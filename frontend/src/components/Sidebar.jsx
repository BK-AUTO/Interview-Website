import React from 'react';
import {
  Box,
  Flex,
  IconButton,
  VStack,
  Text,
  Tooltip,
  Button,
  useColorModeValue
} from '@chakra-ui/react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  SettingsIcon
} from '@chakra-ui/icons';
import { FaUsers } from 'react-icons/fa'; // Importing PeopleIcon from react-icons

const Sidebar = ({ isSidebarMinimized, setIsSidebarMinimized, activeTab, setActiveTab }) => {
  const sidebarBg = useColorModeValue("gray.50", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const buttonHoverBg = useColorModeValue("gray.100", "gray.700");
  const activeButtonBg = useColorModeValue("blue.50", "blue.900");
  const activeButtonColor = useColorModeValue("blue.600", "blue.200");

  return (
    <Box
      bg={sidebarBg}
      borderRight="1px"
      borderColor={borderColor}
      w={isSidebarMinimized ? "80px" : "250px"}
      h="calc(100vh - 90px)" // Change this line to adjust the height
      pos="relative"
      transition="width 0.2s"
      borderRadius="md"
    >
      <IconButton
        aria-label="Toggle Sidebar"
        icon={isSidebarMinimized ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        onClick={() => setIsSidebarMinimized(!isSidebarMinimized)}
        position="absolute"
        right="-12px"
        top="20px"
        size="sm"
        boxShadow="md"
        borderRadius="full"
        zIndex="2"
      />

      <VStack spacing={2} align="stretch" pt={8} px={2} borderRadius="md">
        <Flex direction="column" mb={6} align="center" borderRadius="md">
          {!isSidebarMinimized && (
            <Text fontSize="sm" color="gray.500" borderRadius="md">
              Admin Portal
            </Text>
          )}
        </Flex>

        <Tooltip
          label="Member Management"
          placement="right"
          isDisabled={!isSidebarMinimized}
          borderRadius="md"
        >
          <Button
            leftIcon={<FaUsers />} // Using FaUsers as PeopleIcon
            justifyContent={isSidebarMinimized ? "center" : "flex-start"}
            w="full"
            py={6}
            bg={activeTab === 0 ? activeButtonBg : "transparent"}
            color={activeTab === 0 ? activeButtonColor : "inherit"}
            _hover={{ bg: buttonHoverBg }}
            onClick={() => setActiveTab(0)}
            variant="ghost"
            borderRadius="md"
          >
            {!isSidebarMinimized && "Member Management"}
          </Button>
        </Tooltip>

        <Tooltip
          label="Website Management"
          placement="right"
          isDisabled={!isSidebarMinimized}
          borderRadius="md"
        >
          <Button
            leftIcon={<SettingsIcon />}
            justifyContent={isSidebarMinimized ? "center" : "flex-start"}
            w="full"
            py={6}
            bg={activeTab === 1 ? activeButtonBg : "transparent"}
            color={activeTab === 1 ? activeButtonColor : "inherit"}
            _hover={{ bg: buttonHoverBg }}
            onClick={() => setActiveTab(1)}
            variant="ghost"
            borderRadius="md"
          >
            {!isSidebarMinimized && "Website Management"}
          </Button>
        </Tooltip>
      </VStack>
    </Box>
  );
};

export default Sidebar;
