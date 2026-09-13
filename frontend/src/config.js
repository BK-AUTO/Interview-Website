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
//   which routes /api (including /api/events SSE) through Nginx reverse proxy without CORS or IP issues.
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
  event: 'Sự kiện',
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

// Sub-department independent pipeline states
export const SUB_DEPARTMENT_STATES = [
  'Chờ duyệt',
  'Đậu vòng đơn',
  'Trượt vòng đơn',
  'Gọi PV',
  'Đang phỏng vấn',
  'Đã phỏng vấn',
  'Đạt',
  'Không đạt',
];

export const SUB_DEPARTMENT_STATE_PROPS = {
  'Chờ duyệt': { bg: 'gray.100', color: 'gray.600', borderColor: 'gray.200', label: 'Chờ duyệt' },
  'Đậu vòng đơn': { bg: 'rgba(24, 144, 255, 0.12)', color: 'info.600', borderColor: 'rgba(24, 144, 255, 0.3)', label: 'Đậu vòng đơn' },
  'Trượt vòng đơn': { bg: 'rgba(245, 34, 45, 0.12)', color: 'danger.600', borderColor: 'rgba(245, 34, 45, 0.3)', label: 'Trượt vòng đơn' },
  'Gọi PV': { bg: 'rgba(250, 173, 20, 0.15)', color: 'warning.700', borderColor: 'rgba(250, 173, 20, 0.35)', label: 'Gọi PV' },
  'Đang phỏng vấn': { bg: 'rgba(114, 46, 209, 0.12)', color: 'secondary.600', borderColor: 'rgba(114, 46, 209, 0.35)', label: 'Đang PV' },
  'Đã phỏng vấn': { bg: 'rgba(82, 196, 26, 0.15)', color: 'success.700', borderColor: 'rgba(82, 196, 26, 0.35)', label: 'Đã PV' },
  'Đạt': { bg: 'rgba(58, 197, 105, 0.18)', color: 'primary.700', borderColor: 'rgba(58, 197, 105, 0.4)', label: 'Đạt' },
  'Không đạt': { bg: 'rgba(245, 34, 45, 0.15)', color: 'danger.700', borderColor: 'rgba(245, 34, 45, 0.35)', label: 'Không đạt' },
};

export const parseSubDepartments = (sub) => {
  if (!sub) return [];
  if (Array.isArray(sub)) return sub;
  try {
    const parsed = JSON.parse(sub);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const parseSubDepartmentStates = (states) => {
  if (!states) return {};
  if (typeof states === 'object' && !Array.isArray(states)) return states;
  try {
    const parsed = JSON.parse(states);
    return typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

// Main state pipeline order (numerical index for sequential gate comparison)
export const MAIN_STATE_ORDER = {
  'Chờ duyệt': 0,
  'Trượt vòng đơn': 0,
  'Đậu vòng đơn': 1,
  'Xin đổi lịch': 1,
  'Đã xác nhận': 2,
  'Đã checkin': 3,
  'Gọi PV': 4,
  'Đang phỏng vấn': 5,
  'Đã phỏng vấn': 6,
};

// Sub-dept screening states (Gate 1): unlocked when main >= 'Đậu vòng đơn'
export const SUB_SCREENING_STATES = ['Chờ duyệt', 'Đậu vòng đơn', 'Trượt vòng đơn'];

// Sub-dept interview states (Gate 2): unlocked when main = 'Đã phỏng vấn'
export const SUB_INTERVIEW_STATES = ['Gọi PV', 'Đang phỏng vấn', 'Đã phỏng vấn', 'Đạt', 'Không đạt'];

/**
 * Checks whether sub-department flow is completely locked (Gate 1: main must be at least 'Đậu vòng đơn')
 */
export function isSubDeptLocked(mainState) {
  return (MAIN_STATE_ORDER[mainState] ?? 0) < 1;
}

/**
 * Checks whether sub-department interview states are locked (Gate 2: main must be at least 'Đã phỏng vấn')
 */
export function isSubDeptInterviewLocked(mainState) {
  return (MAIN_STATE_ORDER[mainState] ?? 0) < 6;
}

/**
 * Returns allowed sub-department states based on candidate's main state and sub-dept's current state.
 */
export function getSubDeptAllowedStates(mainState, currentSubState = 'Chờ duyệt') {
  const mainLevel = MAIN_STATE_ORDER[mainState] ?? 0;
  // Gate 1: main < Đậu vòng đơn -> entirely locked
  if (mainLevel < 1) {
    return [];
  }
  // If sub-dept failed screening, it cannot advance to interview
  if (currentSubState === 'Trượt vòng đơn') {
    return SUB_SCREENING_STATES;
  }
  // Gate 2: main reached Đã phỏng vấn -> interview states unlocked
  if (mainLevel >= 6) {
    return [...SUB_SCREENING_STATES, ...SUB_INTERVIEW_STATES];
  }
  // Main >= Đậu vòng đơn but < Đã phỏng vấn: only screening states allowed
  return SUB_SCREENING_STATES;
}

/**
 * Checks whether a candidate is currently in active interview (either main or sub-department).
 */
export function isMemberInActiveInterview(member) {
  if (!member) return false;
  if (member.state === 'Đang phỏng vấn' || member.state === 'Gọi PV') {
    return true;
  }
  const subStates = parseSubDepartmentStates(member.sub_department_states);
  return Object.values(subStates).some(
    (st) => st === 'Đang phỏng vấn' || st === 'Gọi PV'
  );
}

/**
 * Extracts all active interview sessions (main and sub-departments) for a candidate.
 */
export function getMemberActiveInterviewSessions(member) {
  if (!member) return [];
  const sessions = [];

  // 1. Main department session
  if (member.state === 'Đang phỏng vấn' || member.state === 'Gọi PV') {
    sessions.push({
      uniqueKey: `${member.id}-main`,
      member,
      candidateName: member.name,
      candidateMSSV: member.MSSV,
      major_class: member.major_class,
      deptKey: member.specialist,
      deptLabel: DEPARTMENT_LABELS[member.specialist] || member.specialist || 'Chung / Chưa phân mảng',
      state: member.state,
      isSubDept: false,
    });
  }

  // 2. Sub-department sessions
  const subStates = parseSubDepartmentStates(member.sub_department_states);
  Object.entries(subStates).forEach(([subKey, subState]) => {
    if (subState === 'Đang phỏng vấn' || subState === 'Gọi PV') {
      sessions.push({
        uniqueKey: `${member.id}-sub-${subKey}`,
        member,
        candidateName: member.name,
        candidateMSSV: member.MSSV,
        major_class: member.major_class,
        deptKey: subKey,
        deptLabel: DEPARTMENT_LABELS[subKey] || subKey,
        state: subState,
        isSubDept: true,
        subDeptKey: subKey,
      });
    }
  });

  return sessions;
}



