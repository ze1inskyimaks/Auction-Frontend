import axios from 'axios';
import { clearAuthToken, getAuthToken } from './auth-token';

const BASE_URL = 'http://localhost:5041/api/v1';

const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true, // щоб HttpOnly кука "boby" теж ішла автоматично
});

// Interceptor: автоматично додає Bearer токен до кожного запиту
api.interceptors.request.use(
    (config) => {
        const token = getAuthToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Interceptor: якщо прийшов 401 — токен протух, чистимо куку
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            clearAuthToken();
            // Не робимо примусовий редирект тут — нехай компонент вирішує
        }
        return Promise.reject(error);
    }
);

export default api;
