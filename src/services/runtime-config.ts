const trimSlash = (value: string): string => value.replace(/\/+$/, '');

const backendOriginFromEnv = process.env.REACT_APP_BACKEND_ORIGIN;
const fallbackBackendOriginFromEnv = process.env.REACT_APP_BACKEND_FALLBACK_ORIGIN;
const ACTIVE_BACKEND_ORIGIN_KEY = 'auction_active_backend_origin';
const LEGACY_HTTPS_ORIGIN = 'https://localhost:7039';

export const BACKEND_ORIGIN = trimSlash(
    backendOriginFromEnv && backendOriginFromEnv.length > 0
        ? backendOriginFromEnv
        : 'http://localhost:5041'
);

export const FALLBACK_BACKEND_ORIGIN = trimSlash(
    fallbackBackendOriginFromEnv && fallbackBackendOriginFromEnv.length > 0
        ? fallbackBackendOriginFromEnv
        : BACKEND_ORIGIN
);

export const API_BASE_URL = `${BACKEND_ORIGIN}/api/v1`;

export const getRememberedBackendOrigin = (): string | null => {
    const remembered = localStorage.getItem(ACTIVE_BACKEND_ORIGIN_KEY);
    if (!remembered) {
        return null;
    }

    const normalized = trimSlash(remembered);
    if (normalized === LEGACY_HTTPS_ORIGIN && BACKEND_ORIGIN !== LEGACY_HTTPS_ORIGIN) {
        localStorage.removeItem(ACTIVE_BACKEND_ORIGIN_KEY);
        return null;
    }

    return normalized;
};

export const rememberBackendOrigin = (origin: string): void => {
    localStorage.setItem(ACTIVE_BACKEND_ORIGIN_KEY, trimSlash(origin));
};

export const getHubUrls = (): string[] => {
    const remembered = getRememberedBackendOrigin();
    const origins = [remembered, BACKEND_ORIGIN, FALLBACK_BACKEND_ORIGIN]
        .filter((v): v is string => !!v)
        .map(trimSlash)
        .filter((value, index, array) => array.indexOf(value) === index);

    return origins.map((origin) => `${origin}/auctionhub`);
};
