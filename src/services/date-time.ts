const pad = (value: number): string => value.toString().padStart(2, '0');

export const parseApiDate = (value: string): Date => {
    const hasTimeZone = /[zZ]|[+\-]\d{2}:\d{2}$/.test(value);
    return new Date(hasTimeZone ? value : value);
};

export const parseUtcApiDate = (value: string): Date => {
    const hasTimeZone = /[zZ]|[+\-]\d{2}:\d{2}$/.test(value);
    return new Date(hasTimeZone ? value : `${value}Z`);
};

export const toDateTimeLocalValue = (value: Date): string => {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}` +
        `T${pad(value.getHours())}:${pad(value.getMinutes())}`;
};
