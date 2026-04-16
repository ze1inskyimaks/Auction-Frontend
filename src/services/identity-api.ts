import api from './http-client';
import { clearAuthToken, getAuthToken, saveAuthToken } from './auth-token';

const IDENTITY_URL = '/identity';

// ─── DTOs ───────────────────────────────────────────────────────────────────

export interface LoginDTO {
    email: string;
    password: string;
}

export interface RegisterDTO {
    userName: string;
    email: string;
    password: string;
}

// ─── AUTH ────────────────────────────────────────────────────────────────────

export const login = async (dto: LoginDTO): Promise<string> => {
    const response = await api.post<{ token: string; message: string }>(
        `${IDENTITY_URL}/login`,
        dto
    );
    const { token } = response.data;
    saveAuthToken(token);

    return token;
};

export const register = async (dto: RegisterDTO): Promise<void> => {
    await api.post(`${IDENTITY_URL}/register`, dto);
};

export const logout = (): void => {
    clearAuthToken();
};

// ─── ADMIN ──────────────────────────────────────────────────────────────────

export const addRoleToUser = async (userId: string, role: string): Promise<void> => {
    await api.post(`${IDENTITY_URL}/add_role?id=${userId}&role=${role}`);
};

export const removeRoleFromUser = async (userId: string, role: string): Promise<void> => {
    await api.delete(`${IDENTITY_URL}/remove_role?id=${userId}&role=${role}`);
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

export const getTokenPayload = (): Record<string, any> | null => {
    const token = getAuthToken();
    if (!token) return null;

    try {
        const base64Payload = token.split('.')[1];
        const decoded = atob(base64Payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decoded);
    } catch {
        return null;
    }
};

// Виводить весь payload токена в консоль — відкрий DevTools і виклич debugToken()
export const debugToken = (): void => {
    const payload = getTokenPayload();
    console.log('[JWT payload keys]', payload ? Object.keys(payload) : 'no token');
    console.log('[JWT payload full]', payload);
};

export const getCurrentUserRoles = (): string[] => {
    const payload = getTokenPayload();
    if (!payload) return [];

    const roleKey = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
    const roles = payload[roleKey];

    if (!roles) return [];
    return Array.isArray(roles) ? roles : [roles];
};

// ASP.NET Identity може класти ID під різними ключами — перебираємо всі відомі варіанти
export const getCurrentUserId = (): string | null => {
    const payload = getTokenPayload();
    if (!payload) return null;

    const possibleKeys = [
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
        'sub',
        'nameid',
        'userId',
        'id',
    ];

    for (const key of possibleKeys) {
        if (payload[key]) return String(payload[key]);
    }

    console.warn('[identity-api] getCurrentUserId: не знайдено ID в токені. Payload:', payload);
    return null;
};

export const isAuthenticated = (): boolean => {
    return !!getAuthToken();
};
