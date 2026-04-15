import Cookies from 'js-cookie';

const TOKEN_COOKIE_NAME = 'boby';
const TOKEN_STORAGE_KEY = 'auction_jwt';

export const getAuthToken = (): string | null => {
    const cookieToken = Cookies.get(TOKEN_COOKIE_NAME);
    if (cookieToken) {
        return cookieToken;
    }

    return localStorage.getItem(TOKEN_STORAGE_KEY);
};

export const saveAuthToken = (token: string): void => {
    Cookies.set(TOKEN_COOKIE_NAME, token, { expires: 0.5 });
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
};

export const clearAuthToken = (): void => {
    Cookies.remove(TOKEN_COOKIE_NAME);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
};
