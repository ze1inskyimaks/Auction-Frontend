export const getApiErrorMessage = (error: any, fallback: string): string => {
    const status = Number(error?.response?.status ?? 0);

    if (status >= 500) {
        return fallback;
    }

    const direct = error?.response?.data?.message;
    if (typeof direct === 'string' && direct.length > 0) {
        return direct;
    }

    const validationErrors = error?.response?.data?.errors;
    if (validationErrors && typeof validationErrors === 'object') {
        const firstKey = Object.keys(validationErrors)[0];
        const firstMessage = firstKey ? validationErrors[firstKey]?.[0] : null;
        if (typeof firstMessage === 'string' && firstMessage.length > 0) {
            return firstMessage;
        }
    }

    const detail = error?.response?.data?.detail;
    if (typeof detail === 'string' && detail.length > 0) {
        if (detail.includes(' at ') || detail.includes('System.')) {
            return fallback;
        }
        return detail;
    }

    const message = error?.message;
    if (typeof message === 'string' && message.length > 0) {
        return message;
    }

    return fallback;
};
