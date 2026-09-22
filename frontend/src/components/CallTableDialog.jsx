import React, { useEffect, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
  Text,
  HStack,
  Box,
} from '@chakra-ui/react';
import { FaBullhorn } from 'react-icons/fa';

/**
 * Prompts for an interview table/room number at the moment a candidate is
 * called in ('Gọi PV'). Shared by Management.jsx and CandidateDetailModal.jsx
 * so both entry points persist the same table value to the same fields.
 */
const CallTableDialog = ({ isOpen, candidateName, deptLabel, defaultValue = '', onConfirm, onCancel }) => {
  const [table, setTable] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTable(defaultValue || '');
    }
  }, [isOpen, defaultValue]);

  const handleConfirm = () => {
    onConfirm(table.trim());
  };

  return (
    <AlertDialog isOpen={isOpen} leastDestructiveRef={inputRef} onClose={onCancel} isCentered>
      <AlertDialogOverlay bg="blackAlpha.700" backdropFilter="blur(4px)">
        <AlertDialogContent bg="white" borderRadius="xl" mx={4}>
          <AlertDialogHeader pb={2}>
            <HStack spacing={3}>
              <Box p={2} borderRadius="lg" bg="rgba(250, 173, 20, 0.15)" color="warning.600">
                <FaBullhorn size={16} />
              </Box>
              <Box>
                <Text fontSize="md" fontWeight="bold" color="gray.900">
                  Gọi phỏng vấn
                </Text>
                <Text fontSize="xs" color="gray.500" fontWeight="normal">
                  {candidateName}
                  {deptLabel ? ` · ${deptLabel}` : ''}
                </Text>
              </Box>
            </HStack>
          </AlertDialogHeader>

          <AlertDialogBody>
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="semibold" color="gray.700">
                Số bàn / phòng phỏng vấn
              </FormLabel>
              <Input
                ref={inputRef}
                placeholder="VD: Bàn 3, Phòng 301..."
                value={table}
                onChange={(e) => setTable(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirm();
                }}
                autoFocus
                size="md"
              />
              <FormHelperText fontSize="xs">
                Sẽ hiển thị ngay trên Bảng theo dõi phỏng vấn để ứng viên biết vào bàn nào. Có thể bỏ trống nếu chưa xác định.
              </FormHelperText>
            </FormControl>
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button variant="ghost" onClick={onCancel} mr={3}>
              Huỷ
            </Button>
            <Button colorScheme="warning" onClick={handleConfirm}>
              Gọi PV
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};

export default CallTableDialog;
