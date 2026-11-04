import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
  timeout: 180000
});

const TOKEN_KEY = 'vetscholar_access_token';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const saveToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 &&
        !error.config?.url?.includes('/auth/login') &&
        !error.config?.url?.includes('/auth/register')) {
      clearToken();
      window.dispatchEvent(new Event('vetscholar:logout'));
    }
    return Promise.reject(error);
  }
);

export type Doc = {
  id: string; filename: string; size_bytes: number; status: string;
  page_count: number; chunk_count: number; error?: string; created_at: string;
};
