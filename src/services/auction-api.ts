import api from './http-client';
import { Lot } from '../model/Lot';

const AUCTION_URL = '/auction';

// ─── GET ────────────────────────────────────────────────────────────────────

export const getAuctionLot = async (id: string): Promise<Lot> => {
    const response = await api.get<Lot>(`${AUCTION_URL}/${id}`);
    return response.data;
};

export const getActiveAuctionsLots = async (): Promise<Lot[]> => {
    const response = await api.get<Lot[]>(AUCTION_URL);
    return response.data;
};

export const getArchivedAuctionsLots = async (): Promise<Lot[]> => {
    const response = await api.get<Lot[]>(`${AUCTION_URL}/history`);
    return response.data;
};

export interface LotHistoryItem {
    id: string;
    lotId: string;
    historyNumber: number | null;
    bidderId: string;
    bidAmount: number;
    bidTime: string;
}

export const getAuctionLotHistory = async (id: string): Promise<LotHistoryItem[]> => {
    const response = await api.get<LotHistoryItem[]>(`${AUCTION_URL}/${id}/history`);
    return response.data;
};

export interface MyBidHistoryItem {
    id: string;
    lotId: string;
    lotName: string;
    lotStatus: number;
    lotWinnerId: string | null;
    lotEndPrice: number;
    historyNumber: number | null;
    bidderId: string;
    bidAmount: number;
    bidTime: string;
}

export const getMyBidHistory = async (): Promise<MyBidHistoryItem[]> => {
    const response = await api.get<MyBidHistoryItem[]>(`${AUCTION_URL}/my/history/bids`);
    return response.data;
};

export const getMyWinsHistory = async (): Promise<Lot[]> => {
    const response = await api.get<Lot[]>(`${AUCTION_URL}/my/history/wins`);
    return response.data;
};

// ─── CREATE ─────────────────────────────────────────────────────────────────

export interface CreateLotInput {
    name: string;
    description?: string;
    categoryId?: string;
    startPrice: number;
    startTime: string; // ISO string
    file?: File | null;
}

export const createAuctionLot = async (input: CreateLotInput): Promise<string> => {
    const formData = new FormData();
    formData.append('name', input.name);
    if (input.description) formData.append('description', input.description);
    if (input.categoryId) formData.append('categoryId', input.categoryId);
    formData.append('startPrice', input.startPrice.toString());
    formData.append('startTime', new Date(input.startTime).toISOString());
    if (input.file) formData.append('file', input.file);

    const response = await api.post<string>(AUCTION_URL, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

    return response.data; // повертає Guid нового лота
};

// ─── UPDATE ─────────────────────────────────────────────────────────────────

export interface UpdateLotInput {
    name: string;
    description?: string;
    categoryId?: string;
    startPrice: number;
    startTime: string;
}

export const updateAuctionLot = async (lotId: string, input: UpdateLotInput): Promise<string> => {
    const payload = {
        ...input,
        startTime: new Date(input.startTime).toISOString(),
    };

    const response = await api.put<string>(`${AUCTION_URL}?lotId=${lotId}`, payload);
    return response.data;
};

// ─── DELETE ─────────────────────────────────────────────────────────────────

export const deleteAuctionLot = async (lotId: string): Promise<void> => {
    await api.delete(`${AUCTION_URL}?lotId=${lotId}`);
};

export const markAuctionLotAsDelivered = async (lotId: string): Promise<Lot> => {
    const response = await api.put<Lot>(`${AUCTION_URL}/${lotId}/deliver`);
    return response.data;
};

export const cancelAuctionLotDelivery = async (lotId: string): Promise<Lot> => {
    const response = await api.put<Lot>(`${AUCTION_URL}/${lotId}/undeliver`);
    return response.data;
};
