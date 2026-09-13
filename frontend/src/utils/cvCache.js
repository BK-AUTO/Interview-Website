import api from '../api/axios';

// In-memory cache for downloaded CV PDF blob URLs to avoid redundant 5MB downloads
const cvBlobCache = new Map();

/**
 * Opens a candidate's CV.
 * If the CV is hosted internally on /api/uploads/cv/, it checks the in-memory
 * blob cache first. If not cached, it fetches the file once, caches the object URL,
 * and opens it in a new browser tab.
 */
export async function openCandidateCV(linkCV, toast) {
  if (!linkCV) {
    toast?.({
      title: 'Chưa có file CV',
      description: 'Ứng viên chưa tải lên file CV.',
      status: 'warning',
      duration: 3000,
      isClosable: true,
    });
    return;
  }

  // External URLs (e.g. Google Drive / Dropbox / Cloud link)
  if (!linkCV.startsWith('/api/uploads/')) {
    window.open(linkCV, '_blank', 'noopener,noreferrer');
    return;
  }

  // Return cached blob URL if already downloaded in this session
  if (cvBlobCache.has(linkCV)) {
    const cachedUrl = cvBlobCache.get(linkCV);
    window.open(cachedUrl, '_blank');
    return;
  }

  try {
    const response = await api.get(linkCV, { responseType: 'blob' });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const objectUrl = window.URL.createObjectURL(blob);
    cvBlobCache.set(linkCV, objectUrl);
    window.open(objectUrl, '_blank');
  } catch (error) {
    console.error('Error opening CV file:', error);
    toast?.({
      title: 'Không tải được file CV',
      description: error.response?.data?.message || 'Có lỗi khi truy xuất tệp CV từ máy chủ.',
      status: 'error',
      duration: 3500,
      isClosable: true,
    });
  }
}
