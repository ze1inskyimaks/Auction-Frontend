import { BACKEND_ORIGIN } from './runtime-config';

export const resolveImageUrl = (value?: string | null): string => {
    if (!value) {
        return '';
    }

    if (/^https?:\/\//i.test(value)) {
        return value;
    }

    if (value.startsWith('/')) {
        return `${BACKEND_ORIGIN}${value}`;
    }

    return `${BACKEND_ORIGIN}/${value}`;
};
