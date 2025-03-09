import axios from 'axios';
import { BASE_URL } from '../config';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false
});

// Temporarily disable token injection for JWT
api.interceptors.request.use((config) => {
  // const token = localStorage.getItem('token');
  // if (token) {
  //   config.headers.Authorization = `Bearer ${token}`;
  // }
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response?.data || error.message || error);
    if (error.message === 'Network Error') {
      console.error('This appears to be a CORS or network connectivity issue');
    }
    return Promise.reject(error);
  }
);

export default api;
