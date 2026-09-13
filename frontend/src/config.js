import {
  FaUser,
  FaFilePdf,
  FaCheckCircle,
  FaTimesCircle,
  FaCalendarAlt,
  FaEdit,
  FaBullhorn,
  FaMicrophoneAlt,
  FaKey,
} from 'react-icons/fa';

// Backend API URL:
// - When specified via VITE_API_URL, use that explicit endpoint.
// - In local development mode (`pnpm dev`), default to 'http://localhost:8091'.
// - In production container behind Nginx, default to '' (same-origin relative path),
//   which routes /api and /socket.io through Nginx reverse proxy without CORS or IP issues.
export const BASE_URL = import.meta.env.VITE_API_URL !== undefined
  ? import.meta.env.VITE_API_URL
  : (import.meta.env.DEV ? 'http://localhost:8091' : '');

export const DEPARTMENT_LABELS = {
  ai: 'AI for Automobile',
  electrical: 'Điện - Điện tử',
  simulation: 'Mô phỏng',
  experiment: 'Thí nghiệm',
  communication: 'Truyền thông',
  english: 'Tiếng Anh',
  manufacturing: 'Cơ khí',
};

export const TRACK_LABELS = {
  engineering: 'Kỹ thuật',
  media: 'Truyền thông',
};

// Audit-trail presentation, shared by the per-candidate history in
// CandidateDetailModal and the full history screen (AuditLogHistory).
// Keys must match the `action` strings written by record_audit_log() in
// backend/app.py — an unknown action falls back to a neutral gray badge.
export const ACTION_ICONS = {
  'Nộp hồ sơ ứng tuyển': FaFilePdf,
  'Thêm ứng viên': FaUser,
  'Duyệt đậu vòng đơn': FaCheckCircle,
  'Duyệt trượt vòng đơn': FaTimesCircle,
  'Xác nhận tham gia phỏng vấn': FaCalendarAlt,
  'Yêu cầu đổi lịch phỏng vấn': FaCalendarAlt,
  'Tạo lại mật khẩu xác nhận': FaKey,
  'Check-in tại sự kiện': FaCheckCircle,
  'Gọi phỏng vấn': FaBullhorn,
  'Bắt đầu phỏng vấn': FaMicrophoneAlt,
  'Hoàn thành phỏng vấn': FaCheckCircle,
  'Cập nhật thông tin': FaEdit,
  'Chuyển trạng thái': FaEdit,
  'Xoá ứng viên': FaTimesCircle,
};

export const ACTION_COLORS = {
  'Nộp hồ sơ ứng tuyển': { bg: 'rgba(24, 144, 255, 0.12)', color: 'info.600', border: 'rgba(24, 144, 255, 0.3)' },
  'Duyệt đậu vòng đơn': { bg: 'rgba(58, 197, 105, 0.12)', color: 'primary.600', border: 'rgba(58, 197, 105, 0.3)' },
  'Duyệt trượt vòng đơn': { bg: 'rgba(245, 34, 45, 0.12)', color: 'danger.600', border: 'rgba(245, 34, 45, 0.3)' },
  'Xác nhận tham gia phỏng vấn': { bg: 'rgba(82, 196, 26, 0.12)', color: 'success.700', border: 'rgba(82, 196, 26, 0.3)' },
  'Yêu cầu đổi lịch phỏng vấn': { bg: 'rgba(250, 173, 20, 0.12)', color: 'warning.700', border: 'rgba(250, 173, 20, 0.3)' },
  'Tạo lại mật khẩu xác nhận': { bg: 'rgba(250, 173, 20, 0.12)', color: 'warning.700', border: 'rgba(250, 173, 20, 0.3)' },
  'Check-in tại sự kiện': { bg: 'rgba(82, 196, 26, 0.12)', color: 'success.700', border: 'rgba(82, 196, 26, 0.3)' },
  'Gọi phỏng vấn': { bg: 'rgba(250, 173, 20, 0.12)', color: 'warning.700', border: 'rgba(250, 173, 20, 0.3)' },
  'Bắt đầu phỏng vấn': { bg: 'rgba(114, 46, 209, 0.12)', color: 'secondary.600', border: 'rgba(114, 46, 209, 0.35)' },
  'Hoàn thành phỏng vấn': { bg: 'rgba(58, 197, 105, 0.12)', color: 'primary.600', border: 'rgba(58, 197, 105, 0.3)' },
  'Cập nhật thông tin': { bg: 'gray.100', color: 'gray.600', border: 'gray.200' },
  'Xoá ứng viên': { bg: 'rgba(245, 34, 45, 0.12)', color: 'danger.600', border: 'rgba(245, 34, 45, 0.3)' },
};

export const ACTOR_TYPE_LABELS = {
  admin: 'Ban quản trị',
  candidate: 'Ứng viên',
  system: 'Hệ thống',
};
