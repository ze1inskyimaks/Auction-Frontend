import * as signalR from '@microsoft/signalr';
import { getAuthToken } from './auth-token';

const HUB_URL = 'http://localhost:5041/auctionhub';

// ─── Типи подій які приходять з сервера ─────────────────────────────────────

export interface NewLotEvent {
    id: string;
    name: string;
    startPrice: number;
}

export interface DeletedLotEvent {
    id: string;
}

export interface BidEvent {
    lotId: string;
    accountId: string;
    amount: number;
}

export interface FinishLotEvent {
    lotId: string;
    accountId: string;
    amount: number;
}

// ─── Фабрика підключення ─────────────────────────────────────────────────────

const buildConnection = (queryParams?: string): signalR.HubConnection => {
    const url = queryParams ? `${HUB_URL}?${queryParams}` : HUB_URL;

    return new signalR.HubConnectionBuilder()
        .withUrl(url, {
            withCredentials: true,
            accessTokenFactory: () => getAuthToken() ?? '',
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000]) // повтори через 0, 2, 5, 10 сек
        .configureLogging(signalR.LogLevel.Information) // підняли до Information щоб бачити в консолі
        .build();
};

// ─── Lobby connection ─────────────────────────────────────────────────────────

let lobbyConnection: signalR.HubConnection | null = null;

export const getLobbyConnection = (): signalR.HubConnection => {
    if (!lobbyConnection) {
        lobbyConnection = buildConnection();
    }
    return lobbyConnection;
};

export const startLobbyConnection = async (): Promise<void> => {
    const conn = getLobbyConnection();
    if (conn.state === signalR.HubConnectionState.Disconnected) {
        try {
            await conn.start();
            console.log('[SignalR] Lobby підключено');
        } catch (err) {
            console.error('[SignalR] Помилка підключення до Lobby:', err);
            throw err;
        }
    }
};

export const stopLobbyConnection = async (): Promise<void> => {
    if (lobbyConnection?.state === signalR.HubConnectionState.Connecting) {
        return;
    }

    if (lobbyConnection && lobbyConnection.state !== signalR.HubConnectionState.Disconnected) {
        await lobbyConnection.stop();
        console.log('[SignalR] Lobby відключено');
    }
    lobbyConnection = null;
};

// ─── Lot connection ───────────────────────────────────────────────────────────

let lotConnection: signalR.HubConnection | null = null;
let lotConnectionId: string | null = null; // запам'ятовуємо до якого лота підключені

export const getLotConnection = (lotId?: string): signalR.HubConnection | null => {
    if (!lotId) return lotConnection; // для cleanup — просто повертаємо поточне

    if (lotConnection && lotConnectionId === lotId) {
        return lotConnection; // вже підключені до цього лота
    }

    // Якщо підключені до іншого лота — треба спочатку відключитись (через stopLotConnection)
    lotConnection = buildConnection(`lotId=${lotId}`);
    lotConnectionId = lotId;
    return lotConnection;
};

export const startLotConnection = async (lotId: string): Promise<void> => {
    const conn = getLotConnection(lotId)!;
    if (conn.state === signalR.HubConnectionState.Disconnected) {
        try {
            await conn.start();
            console.log(`[SignalR] Lot ${lotId} підключено`);
        } catch (err) {
            console.error(`[SignalR] Помилка підключення до Lot ${lotId}:`, err);
            throw err;
        }
    }
};

export const stopLotConnection = async (): Promise<void> => {
    if (lotConnection?.state === signalR.HubConnectionState.Connecting) {
        return;
    }

    if (lotConnection && lotConnection.state !== signalR.HubConnectionState.Disconnected) {
        await lotConnection.stop();
        console.log('[SignalR] Lot відключено');
    }
    lotConnection = null;
    lotConnectionId = null;
};

// ─── Відправка ставки ─────────────────────────────────────────────────────────

export const placeBid = async (lotId: string, amount: number): Promise<void> => {
    const conn = lotConnection;
    if (!conn || conn.state !== signalR.HubConnectionState.Connected) {
        throw new Error('SignalR не підключений до лота. Перевірте з\'єднання з сервером.');
    }
    await conn.invoke('PlaceBid', lotId, amount);
};
