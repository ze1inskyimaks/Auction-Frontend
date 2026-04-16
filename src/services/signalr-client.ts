import * as signalR from '@microsoft/signalr';
import { getAuthToken } from './auth-token';
import { getHubUrls, rememberBackendOrigin } from './runtime-config';

export interface NewLotEvent {
    id: string;
    name: string;
    startPrice: number;
}

export interface DeletedLotEvent {
    id: string;
}

let lobbyConnection: signalR.HubConnection | null = null;
let lotConnection: signalR.HubConnection | null = null;
let lotConnectionId: string | null = null;

let lobbyStartPromise: Promise<void> | null = null;
let lotStartPromise: Promise<void> | null = null;

const createConnection = (url: string, webSocketOnly: boolean): signalR.HubConnection => {
    const connectionBuilder = new signalR.HubConnectionBuilder()
        .withUrl(url, {
            withCredentials: true,
            accessTokenFactory: () => getAuthToken() ?? '',
            skipNegotiation: webSocketOnly,
            transport: webSocketOnly
                ? signalR.HttpTransportType.WebSockets
                : signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.ServerSentEvents | signalR.HttpTransportType.LongPolling,
        })
        .withAutomaticReconnect([0, 1500, 5000, 10000])
        .configureLogging(signalR.LogLevel.Error);

    const connection = connectionBuilder.build();
    connection.serverTimeoutInMilliseconds = 30000;
    connection.keepAliveIntervalInMilliseconds = 15000;
    return connection;
};

const startWithFallback = async (
    current: signalR.HubConnection | null,
    queryParams?: string
): Promise<signalR.HubConnection> => {
    const urls = getHubUrls().map((base) => (queryParams ? `${base}?${queryParams}` : base));

    if (current && current.state === signalR.HubConnectionState.Connected) {
        return current;
    }

    let lastError: unknown = null;
    for (const url of urls) {
        for (const webSocketOnly of [true, false]) {
            const conn = createConnection(url, webSocketOnly);
            try {
                await conn.start();
                const origin = url.replace(/\/auctionhub(\?.*)?$/, '');
                rememberBackendOrigin(origin);
                return conn;
            } catch (error) {
                lastError = error;
                try {
                    await conn.stop();
                } catch {
                }
            }
        }
    }

    throw lastError ?? new Error('SignalR connection failed');
};

export const getLobbyConnection = (): signalR.HubConnection | null => lobbyConnection;

export const startLobbyConnection = async (): Promise<void> => {
    if (lobbyConnection?.state === signalR.HubConnectionState.Connected) {
        return;
    }

    if (!lobbyStartPromise) {
        lobbyStartPromise = (async () => {
            lobbyConnection = await startWithFallback(lobbyConnection);
        })().finally(() => {
            lobbyStartPromise = null;
        });
    }

    await lobbyStartPromise;
};

export const stopLobbyConnection = async (): Promise<void> => {
    if (!lobbyConnection) {
        return;
    }

    if (lobbyConnection.state === signalR.HubConnectionState.Connecting) {
        try {
            await lobbyStartPromise;
        } catch {
        }
    }

    if (lobbyConnection.state !== signalR.HubConnectionState.Disconnected) {
        await lobbyConnection.stop();
    }

    lobbyConnection = null;
};

export const getLotConnection = (lotId?: string): signalR.HubConnection | null => {
    if (!lotId) {
        return lotConnection;
    }

    if (lotConnection && lotConnectionId === lotId) {
        return lotConnection;
    }

    return null;
};

export const startLotConnection = async (lotId: string): Promise<void> => {
    if (lotConnection?.state === signalR.HubConnectionState.Connected && lotConnectionId === lotId) {
        return;
    }

    if (!lotStartPromise) {
        lotStartPromise = (async () => {
            if (lotConnection && lotConnectionId !== lotId && lotConnection.state !== signalR.HubConnectionState.Disconnected) {
                await lotConnection.stop();
            }

            lotConnection = await startWithFallback(lotConnection, `lotId=${lotId}`);
            lotConnectionId = lotId;
        })().finally(() => {
            lotStartPromise = null;
        });
    }

    await lotStartPromise;
};

export const stopLotConnection = async (): Promise<void> => {
    if (!lotConnection) {
        return;
    }

    if (lotConnection.state === signalR.HubConnectionState.Connecting) {
        try {
            await lotStartPromise;
        } catch {
        }
    }

    if (lotConnection.state !== signalR.HubConnectionState.Disconnected) {
        await lotConnection.stop();
    }

    lotConnection = null;
    lotConnectionId = null;
};

export const placeBid = async (lotId: string, amount: number): Promise<void> => {
    if (!lotConnection || lotConnection.state !== signalR.HubConnectionState.Connected) {
        throw new Error('SignalR не підключений до лота.');
    }

    await lotConnection.invoke('PlaceBid', lotId, amount);
};
