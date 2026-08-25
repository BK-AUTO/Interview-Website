import React from 'react';
import {
  Box,
  Flex,
  IconButton,
  VStack,
  Text,
  Tooltip,
  Button,
  Badge,
  HStack,
} from '@chakra-ui/react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  SettingsIcon,
} from '@chakra-ui/icons';
import {
  FaUsers,
  FaChartBar,
  FaClipboardCheck,
  FaUserCheck,
  FaQrcode,
  FaCheckCircle,
} from 'react-icons/fa';
import { IoLogOutOutline } from 'react-icons/io5';

const NAV_ITEMS = [
  { index: 0, icon: FaClipboardCheck, label: 'Duyệt hồ sơ', badgeKey: 'pending' },
  { index: 1, icon: FaUserCheck, label: 'Ứng viên đã duyệt' },
  { index: 2, icon: FaUsers, label: 'Quản lý ứng viên', badgeKey: 'total' },
  { index: 3, icon: FaChartBar, label: 'Bảng theo dõi PV', badgeKey: 'interviewing' },
  { index: 4, icon: SettingsIcon, label: 'Cấu hình & Website' },
];

const Sidebar = ({
  isSidebarMinimized,
  setIsSidebarMinimized,
  activeTab,
  setActiveTab,
  stats = {},
  currentUser,
  onOpenCheckin,
  onOpenCheckinQr,
  onLogout,
}) => {
  return (
    <Box
      as="aside"
      bg="dark.850"
      borderRight="1px"
      borderColor="dark.border"
      w={isSidebarMinimized ? "72px" : "280px"}
      h="100vh"
      pos="sticky"
      top={0}
      left={0}
      zIndex={20}
      transition="width 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
      display="flex"
      flexDirection="column"
      justifyContent="space-between"
      userSelect="none"
    >
      {/* Brand Header */}
      <Box p={isSidebarMinimized ? 3 : 4} borderBottom="1px" borderColor="dark.border">
        <Flex align="center" justify={isSidebarMinimized ? "center" : "space-between"}>
          {!isSidebarMinimized ? (
            <HStack spacing={3} align="center">
              <Box
                w="36px"
                h="36px"
                borderRadius="lg"
                bg="rgba(58, 197, 105, 0.12)"
                border="1px solid"
                borderColor="rgba(58, 197, 105, 0.3)"
                display="flex"
                alignItems="center"
                justifyContent="center"
                overflow="hidden"
                p={1}
              >
                <img src="/logobkauto.png" alt="BK-AUTO" style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
              </Box>
              <Box>
                <Text
                  fontFamily="heading"
                  fontWeight="bold"
                  fontSize="md"
                  color="white"
                  lineHeight="shorter"
                  letterSpacing="-0.02em"
                >
                  BK-AUTO
                </Text>
                <Text
                  fontSize="10px"
                  fontWeight="700"
                  color="primary.500"
                  letterSpacing="0.12em"
                  textTransform="uppercase"
                >
                  Interview Portal
                </Text>
              </Box>
            </HStack>
          ) : (
            <Box
              w="36px"
              h="36px"
              borderRadius="lg"
              bg="rgba(58, 197, 105, 0.12)"
              border="1px solid"
              borderColor="rgba(58, 197, 105, 0.3)"
              display="flex"
              alignItems="center"
              justifyContent="center"
              p={1}
            >
              <img src="/logobkauto.png" alt="BK-AUTO" style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
            </Box>
          )}

          <IconButton
            aria-label="Toggle Sidebar"
            icon={isSidebarMinimized ? <ChevronRightIcon boxSize={4} /> : <ChevronLeftIcon boxSize={4} />}
            onClick={() => setIsSidebarMinimized(!isSidebarMinimized)}
            size="xs"
            variant="ghost"
            color="whiteAlpha.600"
            _hover={{ color: 'white', bg: 'dark.750' }}
            borderRadius="md"
          />
        </Flex>
      </Box>

      {/* Navigation List */}
      <Box flex="1" py={4} px={2} overflowY="auto">
        {!isSidebarMinimized && (
          <Text
            fontSize="10px"
            fontWeight="700"
            color="whiteAlpha.400"
            textTransform="uppercase"
            letterSpacing="0.08em"
            px={3}
            mb={2}
          >
            Quản trị tuyển dụng
          </Text>
        )}

        <VStack spacing={1.5} align="stretch">
          {NAV_ITEMS.map(({ index, icon: Icon, label, badgeKey }) => {
            const isActive = activeTab === index;
            const badgeCount = badgeKey ? stats[badgeKey] : null;

            return (
              <Tooltip
                key={index}
                label={label}
                placement="right"
                isDisabled={!isSidebarMinimized}
                hasArrow
                bg="dark.800"
                color="white"
                border="1px solid"
                borderColor="dark.border"
                borderRadius="md"
                px={3}
                py={1.5}
                fontSize="xs"
              >
                <Button
                  onClick={() => setActiveTab(index)}
                  justifyContent={isSidebarMinimized ? "center" : "space-between"}
                  w="full"
                  h="44px"
                  px={3}
                  bg={isActive ? 'rgba(58, 197, 105, 0.12)' : 'transparent'}
                  color={isActive ? 'primary.500' : 'whiteAlpha.700'}
                  fontWeight={isActive ? 600 : 500}
                  fontSize="sm"
                  borderLeft={isActive ? '3px solid' : '3px solid transparent'}
                  borderLeftColor={isActive ? 'primary.500' : 'transparent'}
                  borderRadius="md"
                  _hover={{
                    bg: isActive ? 'rgba(58, 197, 105, 0.16)' : 'rgba(255, 255, 255, 0.05)',
                    color: isActive ? 'primary.500' : 'white',
                  }}
                  variant="ghost"
                >
                  <HStack spacing={3} overflow="hidden">
                    <Box as={Icon} boxSize={4} flexShrink={0} color={isActive ? 'primary.500' : 'whiteAlpha.600'} />
                    {!isSidebarMinimized && (
                      <Text isTruncated fontSize="sm">
                        {label}
                      </Text>
                    )}
                  </HStack>

                  {!isSidebarMinimized && badgeCount !== undefined && badgeCount !== null && badgeCount > 0 && (
                    <Badge
                      bg={isActive ? 'primary.500' : 'dark.700'}
                      color={isActive ? 'dark.900' : 'whiteAlpha.800'}
                      fontSize="10px"
                      px={1.5}
                      py={0.5}
                      borderRadius="full"
                      fontWeight="bold"
                    >
                      {badgeCount}
                    </Badge>
                  )}
                </Button>
              </Tooltip>
            );
          })}
        </VStack>

        {/* Quick Check-in Actions */}
        <Box mt={6} pt={4} borderTop="1px" borderColor="dark.border">
          {!isSidebarMinimized && (
            <Text
              fontSize="10px"
              fontWeight="700"
              color="whiteAlpha.400"
              textTransform="uppercase"
              letterSpacing="0.08em"
              px={3}
              mb={2}
            >
              Thao tác nhanh
            </Text>
          )}

          <VStack spacing={1.5} align="stretch">
            <Tooltip
              label="Check-in MSSV"
              placement="right"
              isDisabled={!isSidebarMinimized}
              hasArrow
              bg="dark.800"
              color="white"
            >
              <Button
                onClick={onOpenCheckin}
                justifyContent={isSidebarMinimized ? "center" : "flex-start"}
                w="full"
                h="38px"
                px={3}
                variant="ghost"
                color="whiteAlpha.700"
                _hover={{ bg: 'rgba(58, 197, 105, 0.08)', color: 'primary.500' }}
                borderRadius="md"
                fontSize="xs"
              >
                <HStack spacing={3}>
                  <Box as={FaCheckCircle} boxSize={3.5} color="primary.500" />
                  {!isSidebarMinimized && <Text>Check-in MSSV</Text>}
                </HStack>
              </Button>
            </Tooltip>

            <Tooltip
              label="Check-in QR Code"
              placement="right"
              isDisabled={!isSidebarMinimized}
              hasArrow
              bg="dark.800"
              color="white"
            >
              <Button
                onClick={onOpenCheckinQr}
                justifyContent={isSidebarMinimized ? "center" : "flex-start"}
                w="full"
                h="38px"
                px={3}
                variant="ghost"
                color="whiteAlpha.700"
                _hover={{ bg: 'rgba(58, 197, 105, 0.08)', color: 'primary.500' }}
                borderRadius="md"
                fontSize="xs"
              >
                <HStack spacing={3}>
                  <Box as={FaQrcode} boxSize={3.5} color="info.500" />
                  {!isSidebarMinimized && <Text>Quét mã QR</Text>}
                </HStack>
              </Button>
            </Tooltip>
          </VStack>
        </Box>
      </Box>

      {/* Footer Profile & Logout */}
      <Box p={3} borderTop="1px" borderColor="dark.border" bg="dark.900">
        <Flex align="center" justify={isSidebarMinimized ? "center" : "space-between"}>
          {!isSidebarMinimized && (
            <HStack spacing={2.5} overflow="hidden">
              {currentUser?.picture ? (
                <Box
                  as="img"
                  src={currentUser.picture}
                  alt={currentUser.display_name || 'User Avatar'}
                  w="32px"
                  h="32px"
                  borderRadius="full"
                  border="1px solid"
                  borderColor="dark.border"
                  flexShrink={0}
                />
              ) : (
                <Box
                  w="32px"
                  h="32px"
                  borderRadius="full"
                  bg="rgba(58, 197, 105, 0.15)"
                  border="1px solid"
                  borderColor="rgba(58, 197, 105, 0.3)"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  fontSize="xs"
                  fontWeight="bold"
                  color="primary.500"
                  flexShrink={0}
                >
                  {currentUser?.name ? currentUser.name.trim().slice(-1) : 'AD'}
                </Box>
              )}
              <Box overflow="hidden">
                <Text fontSize="xs" fontWeight="semibold" color="white" isTruncated>
                  {currentUser?.display_name || currentUser?.name || 'Ban Quản Trị'}
                </Text>
                <HStack spacing={1}>
                  <Box w="6px" h="6px" borderRadius="full" bg="primary.500" />
                  <Text fontSize="10px" color="whiteAlpha.500" isTruncated>
                    {currentUser?.role_clb || currentUser?.username || 'BK-AUTO SSO'}
                  </Text>
                </HStack>
              </Box>
            </HStack>
          )}

          <Tooltip
            label="Đăng xuất"
            placement={isSidebarMinimized ? "right" : "top"}
            hasArrow
            bg="dark.800"
            color="white"
          >
            <IconButton
              aria-label="Đăng xuất"
              icon={<IoLogOutOutline size={18} />}
              onClick={onLogout}
              size="sm"
              variant="ghost"
              color="danger.500"
              _hover={{ bg: 'rgba(245, 34, 45, 0.12)', color: 'danger.500' }}
              borderRadius="md"
            />
          </Tooltip>
        </Flex>
      </Box>
    </Box>
  );
};

export default Sidebar;
