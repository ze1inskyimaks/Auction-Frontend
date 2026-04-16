import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveAuctionsLots } from '../services/auction-api';
import {
    startLobbyConnection,
    stopLobbyConnection,
    getLobbyConnection,
    NewLotEvent,
    DeletedLotEvent,
} from '../services/signalr-client';
import { isAuthenticated } from '../services/identity-api';
import { Lot } from '../model/Lot';

const HomePage: React.FC = () => {
    const [lots, setLots] = useState<Lot[]>([]);
    const [error, setError] = useState('');
    const [signalRStatus, setSignalRStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
    const navigate = useNavigate();

    // ── Завантаження початкового списку лотів ──────────────────────────────
    useEffect(() => {
        const fetchLots = async () => {
            try {
                const data = await getActiveAuctionsLots();
                setLots(data);
            } catch {
                setError('Не вдалося завантажити лоти.');
            }
        };

        fetchLots();
    }, []);

    // ── SignalR підключення до лобі ────────────────────────────────────────
    useEffect(() => {
        if (!isAuthenticated()) {
            setSignalRStatus('error');
            return;
        }

        const connect = async () => {
            try {
                await startLobbyConnection();
                setSignalRStatus('connected');

                const conn = getLobbyConnection();
                if (!conn) {
                    setSignalRStatus('error');
                    return;
                }

                // Новий або змінений лот — додаємо/оновлюємо в списку
                conn.on('ReceiveNewLot', (event: NewLotEvent) => {
                    setLots((prev) => {
                        const exists = prev.find((l) => l.id === event.id);
                        if (exists) {
                            // Оновлюємо існуючий лот
                            return prev.map((l) =>
                                l.id === event.id
                                    ? { ...l, name: event.name, startPrice: event.startPrice }
                                    : l
                            );
                        }
                        // Додаємо новий (мінімальні дані з події, решту підтягне окрема сторінка)
                        return [
                            ...prev,
                            {
                                id: event.id,
                                name: event.name,
                                description: '',
                                linkToImage: '',
                                startTime: new Date().toISOString(),
                                ownerId: '',
                                currentWinnerId: null,
                                startPrice: event.startPrice,
                                currentPrice: event.startPrice,
                                lastBitTime: new Date(0).toISOString(),
                                auctionHistoryId: null,
                                endPrice: 0,
                                winnerId: null,
                                status: 0,
                                updatedAt: new Date().toISOString(),
                                createdAt: new Date().toISOString(),
                            } as Lot,
                        ];
                    });
                });

                // Лот видалено — прибираємо зі списку
                conn.on('ReceiveDeletedLot', (event: DeletedLotEvent) => {
                    setLots((prev) => prev.filter((l) => l.id !== event.id));
                });

            } catch {
                setSignalRStatus('error');
            }
        };

        connect();

        // При виході зі сторінки — відключаємось
        return () => {
            const conn = getLobbyConnection();
            conn?.off('ReceiveNewLot');
            conn?.off('ReceiveDeletedLot');
            stopLobbyConnection();
        };
    }, []);

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Активні лоти</h1>

            {/* Статус SignalR */}
            <div className="mb-3 text-sm">
                {signalRStatus === 'connecting' && (
                    <span className="text-yellow-500">⏳ Підключення до live-оновлень...</span>
                )}
                {signalRStatus === 'connected' && (
                    <span className="text-green-500">🟢 Live-оновлення активні</span>
                )}
                {signalRStatus === 'error' && (
                    <span className="text-red-500">🔴 Live-оновлення недоступні</span>
                )}
            </div>

            {error && <div className="text-red-500 mb-3">{error}</div>}

            {lots.length === 0 ? (
                <p className="text-gray-500">Активних лотів немає.</p>
            ) : (
                <ul className="space-y-2">
                    {lots.map((lot) => (
                        <li
                            key={lot.id}
                            className="flex items-center justify-between border rounded-md p-3 bg-white shadow-sm"
                        >
                            <div>
                                <span className="font-semibold">{lot.name}</span>
                                <span className="ml-3 text-gray-500 text-sm">
                                    Стартова ціна: {lot.startPrice} грн
                                </span>
                                {lot.currentPrice > lot.startPrice && (
                                    <span className="ml-3 text-blue-600 text-sm font-medium">
                                        Поточна: {lot.currentPrice} грн
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => navigate(`/lot/${lot.id}`)}
                                className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 text-sm"
                            >
                                Перейти
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default HomePage;
