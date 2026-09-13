import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Flex,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Button,
  HStack,
  Badge,
  useToast,
  SimpleGrid,
  Input,
  Select,
  Spinner,
  Tooltip,
} from '@chakra-ui/react';
import {
  FaHistory,
  FaUserShield,
  FaUserGraduate,
  FaTrashAlt,
  FaSyncAlt,
} from 'react-icons/fa';
import api from '../api/axios';
import { ACTION_ICONS, ACTION_COLORS, ACTOR_TYPE_LABELS } from '../config';

const NEUTRAL_ACTION = { bg: 'gray.100', color: 'gray.600', border: 'gray.200' };

/**
 * Full audit trail across every candidate — including ones that have since
 * been deleted. Backed by GET /api/audit-logs, which is the only endpoint
 * that can surface logs whose member_id went NULL on delete (the per-candidate
 * endpoint needs an id that no longer resolves to anything). Deleted
 * candidates are identified through the name/MSSV snapshot the backend
 * records on every log line.
 */
const AuditLogHistory = () => {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [actorTypeFilter, setActorTypeFilter] = useState('');
  const [deletedOnly, setDeletedOnly] = useState(false);

  const fetchLogs = useCallback(async (showToast = false) => {
    setLoading(true);
    try {
      const res = await api.get('/api/audit-logs', { params: { limit: 500 } });
      setLogs(res.data || []);
      if (showToast) {
        toast({ title: 'Đã tải lại lịch sử thao tác', status: 'success', duration: 2000, isClosable: true });
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      if (showToast) {
        toast({
          title: 'Không thể tải lịch sử thao tác',
          description: err.response?.data?.error || err.message,
          status: 'error',
          duration: 4000,
          isClosable: true,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLogs();

    // Automatically sync audit logs when realtime updates happen on other tabs
    const handleDataUpdated = () => {
      fetchLogs();
    };

    window.addEventListener('app:data-updated', handleDataUpdated);
    return () => window.removeEventListener('app:data-updated', handleDataUpdated);
  }, [fetchLogs]);

  const adminCount = useMemo(() => logs.filter((l) => l.actor_type === 'admin').length, [logs]);
  const candidateCount = useMemo(() => logs.filter((l) => l.actor_type === 'candidate').length, [logs]);
  // member_id NULL => the Member row is gone but the log survived (ondelete SET NULL).
  const orphanCount = useMemo(() => logs.filter((l) => !l.member_id).length, [logs]);

  const uniqueActions = useMemo(() => {
    return [...new Set(logs.map((l) => l.action).filter(Boolean))];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return logs.filter((l) => {
      const matchSearch =
        term === '' ||
        (l.member_name_snapshot || '').toLowerCase().includes(term) ||
        (l.member_mssv_snapshot || '').toLowerCase().includes(term) ||
        (l.actor_name || '').toLowerCase().includes(term) ||
        (l.actor_username || '').toLowerCase().includes(term) ||
        (l.action || '').toLowerCase().includes(term) ||
        (l.details || '').toLowerCase().includes(term);
      const matchAction = actionFilter === '' || l.action === actionFilter;
      const matchActorType = actorTypeFilter === '' || l.actor_type === actorTypeFilter;
      const matchDeleted = !deletedOnly || !l.member_id;
      return matchSearch && matchAction && matchActorType && matchDeleted;
    });
  }, [logs, searchTerm, actionFilter, actorTypeFilter, deletedOnly]);

  return (
    <Box pb={8}>
      {/* Page Title */}
      <Box mb={6}>
        <Flex justify="space-between" align="flex-start" flexWrap="wrap" gap={3}>
          <HStack spacing={3} mb={1}>
            <Box p={2} borderRadius="lg" bg="rgba(114, 46, 209, 0.12)" color="secondary.500">
              <FaHistory size={20} />
            </Box>
            <Box>
              <Heading fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color="gray.900">
                Lịch sử thao tác toàn hệ thống
              </Heading>
              <Text fontSize="xs" color="gray.500">
                Nhật ký không thể xoá của mọi thao tác trên hồ sơ ứng viên — giữ lại cả hồ sơ đã bị xoá
              </Text>
            </Box>
          </HStack>

          <Button
            size="sm"
            variant="outline"
            colorScheme="secondary"
            leftIcon={<FaSyncAlt />}
            onClick={() => fetchLogs(true)}
            isLoading={loading}
          >
            Tải lại
          </Button>
        </Flex>
      </Box>

      {/* KPI Stat Cards */}
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4} mb={6}>
        <Box p={4} borderRadius="xl" bg="white" borderWidth="1px" borderColor="gray.200">
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="0.05em">
                Tổng số bản ghi
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="gray.900" mt={1}>
                {logs.length}
              </Text>
            </Box>
            <Box p={3} borderRadius="xl" bg="rgba(114, 46, 209, 0.12)" color="secondary.500">
              <FaHistory size={22} />
            </Box>
          </Flex>
        </Box>

        <Box p={4} borderRadius="xl" bg="white" borderWidth="1px" borderColor="gray.200">
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="0.05em">
                Thao tác ban quản trị
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="primary.500" mt={1}>
                {adminCount}
              </Text>
            </Box>
            <Box p={3} borderRadius="xl" bg="rgba(58, 197, 105, 0.12)" color="primary.500">
              <FaUserShield size={22} />
            </Box>
          </Flex>
        </Box>

        <Box p={4} borderRadius="xl" bg="white" borderWidth="1px" borderColor="gray.200">
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="0.05em">
                Thao tác ứng viên
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="info.500" mt={1}>
                {candidateCount}
              </Text>
            </Box>
            <Box p={3} borderRadius="xl" bg="rgba(24, 144, 255, 0.12)" color="info.500">
              <FaUserGraduate size={22} />
            </Box>
          </Flex>
        </Box>

        <Tooltip
          label="Bản ghi của ứng viên đã bị xoá khỏi danh sách — log vẫn được giữ nguyên vĩnh viễn"
          hasArrow
          bg="dark.800"
          color="white"
        >
          <Box
            p={4}
            borderRadius="xl"
            bg="white"
            borderWidth="1px"
            borderColor={orphanCount > 0 ? 'rgba(245, 34, 45, 0.3)' : 'gray.200'}
            cursor="pointer"
            onClick={() => setDeletedOnly((prev) => !prev)}
            _hover={{ borderColor: 'rgba(245, 34, 45, 0.5)' }}
          >
            <Flex justify="space-between" align="center">
              <Box>
                <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="0.05em">
                  Của ứng viên đã xoá
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="danger.500" mt={1}>
                  {orphanCount}
                </Text>
              </Box>
              <Box p={3} borderRadius="xl" bg="rgba(245, 34, 45, 0.12)" color="danger.500">
                <FaTrashAlt size={22} />
              </Box>
            </Flex>
          </Box>
        </Tooltip>
      </SimpleGrid>

      {/* Filter & Search Bar */}
      <Box p={4} borderRadius="xl" bg="white" borderWidth="1px" borderColor="gray.200" mb={6}>
        <HStack spacing={4} flexWrap="wrap">
          <Box flex="1" minW="240px">
            <Input
              placeholder="Tìm theo tên ứng viên, MSSV, người thực hiện, nội dung..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="sm"
            />
          </Box>
          <Box w={{ base: 'full', sm: '220px' }}>
            <Select
              placeholder="Tất cả hành động"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              size="sm"
            >
              {uniqueActions.map((action) => (
                <option key={action} value={action} style={{ background: '#ffffff', color: '#141414' }}>
                  {action}
                </option>
              ))}
            </Select>
          </Box>
          <Box w={{ base: 'full', sm: '180px' }}>
            <Select
              placeholder="Tất cả người thực hiện"
              value={actorTypeFilter}
              onChange={(e) => setActorTypeFilter(e.target.value)}
              size="sm"
            >
              {Object.entries(ACTOR_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value} style={{ background: '#ffffff', color: '#141414' }}>
                  {label}
                </option>
              ))}
            </Select>
          </Box>
          <Button
            size="sm"
            variant={deletedOnly ? 'solid' : 'outline'}
            colorScheme="danger"
            leftIcon={<FaTrashAlt />}
            onClick={() => setDeletedOnly((prev) => !prev)}
          >
            Chỉ hồ sơ đã xoá
          </Button>
        </HStack>
      </Box>

      {/* Audit Log Table */}
      {loading ? (
        <Box textAlign="center" py={16} bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl">
          <Spinner size="lg" color="secondary.500" thickness="3px" />
          <Text fontSize="sm" color="gray.500" mt={3}>
            Đang tải lịch sử thao tác...
          </Text>
        </Box>
      ) : filteredLogs.length === 0 ? (
        <Box textAlign="center" py={12} bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl">
          <Box as={FaHistory} boxSize={10} color="gray.200" mx="auto" mb={3} />
          <Text fontSize="md" fontWeight="medium" color="gray.600">
            {logs.length === 0 ? 'Chưa có bản ghi thao tác nào' : 'Không tìm thấy bản ghi phù hợp với bộ lọc'}
          </Text>
          <Text fontSize="xs" color="gray.300" mt={1}>
            {logs.length === 0
              ? 'Mọi thao tác duyệt hồ sơ, check-in, phỏng vấn sẽ được ghi lại tự động tại đây'
              : 'Thử xoá bớt từ khoá hoặc bộ lọc'}
          </Text>
        </Box>
      ) : (
        <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" overflow="hidden">
          <Flex px={4} py={3} bg="gray.50" borderBottomWidth="1px" borderColor="gray.200" justify="space-between" align="center">
            <Text fontSize="xs" color="gray.500">
              Hiển thị <strong>{filteredLogs.length}</strong> / {logs.length} bản ghi
            </Text>
            <Text fontSize="10px" color="gray.400">
              Nhật ký chỉ ghi thêm — không bao giờ bị xoá kể cả khi ứng viên bị xoá khỏi hệ thống
            </Text>
          </Flex>

          <Box overflowX="auto">
            <Table variant="simple" size="sm">
              <Thead bg="gray.50">
                <Tr>
                  <Th color="gray.500" py={3.5} fontSize="11px">Thời gian</Th>
                  <Th color="gray.500" py={3.5} fontSize="11px">Ứng viên</Th>
                  <Th color="gray.500" py={3.5} fontSize="11px">Hành động</Th>
                  <Th color="gray.500" py={3.5} fontSize="11px">Chi tiết</Th>
                  <Th color="gray.500" py={3.5} fontSize="11px">Người thực hiện</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredLogs.map((log) => {
                  const actionStyle = ACTION_COLORS[log.action] || NEUTRAL_ACTION;
                  const ActionIcon = ACTION_ICONS[log.action];
                  const isOrphan = !log.member_id;

                  return (
                    <Tr
                      key={log.id}
                      _hover={{ bg: 'gray.50' }}
                      transition="background-color 0.15s"
                      borderColor="gray.200"
                    >
                      <Td py={3} whiteSpace="nowrap">
                        <Text fontSize="xs" color="gray.700" fontFamily="mono">
                          {log.created_at}
                        </Text>
                      </Td>

                      <Td py={3}>
                        <Text fontWeight="semibold" color="gray.900" fontSize="sm">
                          {log.member_name_snapshot || '(không rõ)'}
                        </Text>
                        <HStack spacing={2} mt={0.5}>
                          {log.member_mssv_snapshot && (
                            <Text fontSize="xs" color="primary.600" fontFamily="mono">
                              {log.member_mssv_snapshot}
                            </Text>
                          )}
                          {isOrphan && (
                            <Badge
                              bg="rgba(245, 34, 45, 0.12)"
                              color="danger.600"
                              border="1px solid"
                              borderColor="rgba(245, 34, 45, 0.3)"
                              fontSize="10px"
                            >
                              Đã xoá hồ sơ
                            </Badge>
                          )}
                        </HStack>
                      </Td>

                      <Td py={3}>
                        <Badge
                          bg={actionStyle.bg}
                          color={actionStyle.color}
                          border="1px solid"
                          borderColor={actionStyle.border}
                          fontSize="xs"
                          display="inline-flex"
                          alignItems="center"
                          gap={1.5}
                          px={2}
                          py={1}
                        >
                          {ActionIcon && <Box as={ActionIcon} boxSize={3} />}
                          {log.action}
                        </Badge>
                      </Td>

                      <Td py={3} maxW="360px">
                        <Text fontSize="xs" color="gray.600" whiteSpace="normal">
                          {log.details || '-'}
                        </Text>
                      </Td>

                      <Td py={3}>
                        <Text fontSize="xs" color="gray.700" fontWeight="medium">
                          {log.actor_name || log.actor_username || '-'}
                        </Text>
                        <HStack spacing={2} mt={0.5}>
                          <Badge
                            variant="subtle"
                            bg={log.actor_type === 'admin' ? 'rgba(58, 197, 105, 0.12)' : 'gray.100'}
                            color={log.actor_type === 'admin' ? 'primary.600' : 'gray.600'}
                            fontSize="10px"
                          >
                            {ACTOR_TYPE_LABELS[log.actor_type] || log.actor_type}
                          </Badge>
                          {log.actor_email && (
                            <Text fontSize="10px" color="gray.400" isTruncated maxW="160px">
                              {log.actor_email}
                            </Text>
                          )}
                        </HStack>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default AuditLogHistory;
