import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  FormControl,
  FormLabel,
  InputGroup,
  Input,
  InputRightElement,
  VStack,
  HStack,
  Text,
  Box,
  useToast,
} from '@chakra-ui/react';
import { FaKey, FaCopy } from 'react-icons/fa';

// Shown right after a candidate is approved (or their confirmation link is
// reset) — this is the ONLY time the plaintext password is ever available;
// the backend only stores its hash. Admin copies both and sends manually.
const ConfirmCredentialsModal = ({ isOpen, onClose, url, password, candidateName }) => {
  const toast = useToast();

  const copy = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({
        title: `Đã copy ${label}`,
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch {
      toast({
        title: 'Không copy được, hãy bôi đen và copy thủ công',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="lg">
      <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(4px)" />
      <ModalContent bg="dark.800" borderColor="dark.border" borderWidth="1px" borderRadius="xl">
        <ModalHeader borderBottomWidth="1px" borderColor="dark.border" py={4}>
          <HStack spacing={3}>
            <Box p={2} borderRadius="lg" bg="rgba(58, 197, 105, 0.12)" color="primary.500">
              <FaKey size={16} />
            </Box>
            <Box>
              <Text fontSize="md" fontWeight="bold" color="white">
                Thông tin xác nhận phỏng vấn
              </Text>
              <Text fontSize="xs" fontWeight="normal" color="whiteAlpha.600">
                Ứng viên: <Text as="span" color="primary.500" fontWeight="bold">{candidateName}</Text>
              </Text>
            </Box>
          </HStack>
        </ModalHeader>
        <ModalCloseButton color="whiteAlpha.600" />
        
        <ModalBody py={6}>
          <VStack spacing={5} align="stretch">
            <Box p={3} borderRadius="lg" bg="rgba(58, 197, 105, 0.06)" border="1px solid" borderColor="rgba(58, 197, 105, 0.2)">
              <Text fontSize="xs" color="whiteAlpha.800">
                💡 Gửi đường link và mật khẩu 6 số này cho ứng viên (qua email / Facebook / Zalo...).
                Ứng viên sẽ dùng để tự xác nhận tham gia hoặc gửi yêu cầu đổi lịch.
              </Text>
            </Box>

            <FormControl>
              <FormLabel fontSize="xs" fontWeight="bold" color="whiteAlpha.700" textTransform="uppercase" letterSpacing="0.05em">
                Link xác nhận tham gia
              </FormLabel>
              <InputGroup size="md">
                <Input value={url || ''} isReadOnly bg="dark.900" fontSize="sm" pr="5rem" />
                <InputRightElement w="4.5rem">
                  <Button
                    size="xs"
                    colorScheme="primary"
                    variant="solid"
                    leftIcon={<FaCopy />}
                    onClick={() => copy(url, 'link')}
                  >
                    Copy
                  </Button>
                </InputRightElement>
              </InputGroup>
            </FormControl>

            {password ? (
              <FormControl>
                <FormLabel fontSize="xs" fontWeight="bold" color="whiteAlpha.700" textTransform="uppercase" letterSpacing="0.05em">
                  Mật khẩu truy cập (6 số)
                </FormLabel>
                <InputGroup size="lg">
                  <Input
                    value={password}
                    isReadOnly
                    bg="dark.900"
                    color="primary.500"
                    fontSize="2xl"
                    fontWeight="bold"
                    letterSpacing="8px"
                    textAlign="center"
                    pr="5rem"
                  />
                  <InputRightElement w="4.5rem" h="full">
                    <Button
                      size="xs"
                      colorScheme="primary"
                      variant="solid"
                      leftIcon={<FaCopy />}
                      onClick={() => copy(password, 'mật khẩu')}
                    >
                      Copy
                    </Button>
                  </InputRightElement>
                </InputGroup>
                <Text fontSize="xs" color="warning.500" mt={1.5}>
                  ⚠️ Mật khẩu chỉ hiển thị một lần duy nhất lúc tạo. Nếu mất, vui lòng dùng nút &ldquo;Tạo mật khẩu mới&rdquo;.
                </Text>
              </FormControl>
            ) : (
              <Box p={3} borderRadius="md" bg="dark.900" border="1px dashed" borderColor="dark.border">
                <Text fontSize="xs" color="whiteAlpha.500">
                  Mật khẩu được lưu trữ dưới dạng mã hoá (hash) an toàn. Để cấp lại mật khẩu mới, admin bấm &ldquo;Tạo mật khẩu mới&rdquo; tại danh sách Ứng viên đã duyệt.
                </Text>
              </Box>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter borderTopWidth="1px" borderColor="dark.border">
          <Button colorScheme="primary" onClick={onClose}>
            Hoàn tất
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ConfirmCredentialsModal;
