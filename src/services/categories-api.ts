import api from './http-client';

const CATEGORIES_URL = '/categories';

export interface Category {
    id: string;
    name: string;
    description?: string | null;
}

export interface CategoryRequest {
    id: string;
    name: string;
    description?: string | null;
    status: 'Pending' | 'Approved' | 'Rejected' | string | number;
    adminComment?: string | null;
    categoryId?: string | null;
    requestedBy?: {
        requestedById: string;
        userName?: string | null;
        email?: string | null;
    } | null;
    reviewedBy?: {
        reviewedById: string;
        userName?: string | null;
        email?: string | null;
    } | null;
    createdAt: string;
    reviewedAt?: string | null;
}

export interface CreateCategoryRequestInput {
    name: string;
    description?: string;
}

export interface ReviewCategoryRequestInput {
    adminComment?: string;
}

export interface CreateCategoryInput {
    name: string;
    description?: string;
}

export const getCategories = async (): Promise<Category[]> => {
    const response = await api.get<Category[]>(CATEGORIES_URL);
    return response.data;
};

export const createCategoryRequest = async (input: CreateCategoryRequestInput): Promise<void> => {
    await api.post(`${CATEGORIES_URL}/requests`, input);
};

export const getCategoryRequests = async (): Promise<CategoryRequest[]> => {
    const response = await api.get<CategoryRequest[]>(`${CATEGORIES_URL}/requests`);
    return response.data.map((request) => ({
        ...request,
        status: normalizeRequestStatus(request.status),
    }));
};

export const approveCategoryRequest = async (id: string, input?: ReviewCategoryRequestInput): Promise<void> => {
    await api.post(`${CATEGORIES_URL}/requests/${id}/approve`, input ?? {});
};

export const rejectCategoryRequest = async (id: string, input?: ReviewCategoryRequestInput): Promise<void> => {
    await api.post(`${CATEGORIES_URL}/requests/${id}/reject`, input ?? {});
};

export const createCategory = async (input: CreateCategoryInput): Promise<void> => {
    await api.post(CATEGORIES_URL, input);
};

const normalizeRequestStatus = (status: CategoryRequest['status']): 'Pending' | 'Approved' | 'Rejected' | string => {
    if (typeof status === 'number') {
        if (status === 0) return 'Pending';
        if (status === 1) return 'Approved';
        if (status === 2) return 'Rejected';
        return String(status);
    }

    const normalized = String(status).toLowerCase();
    if (normalized === 'pending') return 'Pending';
    if (normalized === 'approved') return 'Approved';
    if (normalized === 'rejected') return 'Rejected';
    return String(status);
};
