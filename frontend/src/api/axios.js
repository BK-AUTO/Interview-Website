import axios from 'axios';
import { BASE_URL } from '../config';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response?.data || error.message || error);
    if (error.message === 'Network Error') {
      console.error('This appears to be a CORS or network connectivity issue');
    }
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export default api;
