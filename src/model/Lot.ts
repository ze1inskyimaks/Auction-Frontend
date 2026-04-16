export interface Lot {
    id: string;
    name: string;
    description: string;
    categoryId?: string | null;
    categoryName?: string | null;
    linkToImage?: string;
    startTime: string;
    ownerId: string;
    ownerUserName?: string | null;
    currentWinnerId: string | null;
    currentPrice: number;
    lastBitTime: string;
    auctionHistoryId: string[] | null;
    startPrice: number;
    endPrice: number;
    winnerId: string | null;
    winnerUserName?: string | null;
    status: number;
    updatedAt: string;
    createdAt: string;
}
