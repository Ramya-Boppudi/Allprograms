import axios from 'axios';
import API_BASE_URL from '../config/apiBase';

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ksba_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ksba_token');
      localStorage.removeItem('ksba_auth');
    }
    return Promise.reject(err);
  }
);

export default api;
