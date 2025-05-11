export interface Lot {
    id: string;
    name: string;
    description: string;
    linkToImage?: string;
    startTime: string; // або Date, якщо будеш конвертувати
    ownerId: string;
    currentWinnerId: string | null;
    currentPrice: number;
    lastBitTime: string;
    auctionHistoryId: string | null;
    startPrice: number;
    endPrice: number;
    winnerId: string | null;
    status: number;
    updatedAt: string;
    createdAt: string;
}
