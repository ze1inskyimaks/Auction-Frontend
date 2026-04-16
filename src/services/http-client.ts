import axios from 'axios';
import { clearAuthToken, getAuthToken } from './auth-token';
import {
    API_BASE_URL,
    FALLBACK_BACKEND_ORIGIN,
    getRememberedBackendOrigin,
    rememberBackendOrigin,
} from './runtime-config';

const FALLBACK_API_BASE_URL = `${FALLBACK_BACKEND_ORIGIN}/api/v1`;
const rememberedOrigin = getRememberedBackendOrigin();
let activeBaseUrl = rememberedOrigin ? `${rememberedOrigin}/api/v1` : API_BASE_URL;

const httpClient = axios.create({
    baseURL: activeBaseUrl,
    withCredentials: true,
});

httpClient.interceptors.request.use(
    (config) => {
        const token = getAuthToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

httpClient.interceptors.response.use(
    (response) => {
        if (activeBaseUrl.includes('/api/v1')) {
            rememberBackendOrigin(activeBaseUrl.replace(/\/api\/v1$/, ''));
        }
        return response;
    },
    async (error) => {
        const requestConfig = error?.config as (any | undefined);
        const isNetworkError = !error?.response;

        if (requestConfig && isNetworkError && !requestConfig.__fallbackRetryDone && activeBaseUrl !== FALLBACK_API_BASE_URL) {
            activeBaseUrl = FALLBACK_API_BASE_URL;
            httpClient.defaults.baseURL = activeBaseUrl;
            rememberBackendOrigin(FALLBACK_BACKEND_ORIGIN);
            requestConfig.__fallbackRetryDone = true;
            return httpClient(requestConfig);
        }

        if (error?.response && activeBaseUrl.includes('/api/v1')) {
            rememberBackendOrigin(activeBaseUrl.replace(/\/api\/v1$/, ''));
        }

        if (error.response?.status === 401) {
            clearAuthToken();
        }
        return Promise.reject(error);
    }
);

export default httpClient;
