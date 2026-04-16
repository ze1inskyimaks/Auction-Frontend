import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lot } from '../model/Lot';
import { getAuctionLot, deleteAuctionLot } from '../services/auction-api';
import { getCurrentUserId, debugToken, isAuthenticated } from '../services/identity-api';
import {
    startLotConnection,
    stopLotConnection,
    getLotConnection,
    placeBid,
} from '../services/signalr-client';
import { parseApiDate } from '../services/date-time';

const AUCTION_TIMER_SECONDS = 15;

const LotPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [lot, setLot] = useState<Lot | null>(null);
    const [error, setError] = useState('');
    const [signalRStatus, setSignalRStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

    // Ставка
    const [bidAmount, setBidAmount] = useState<number>(0);
    const [bidError, setBidError] = useState('');
    const [bidLoading, setBidLoading] = useState(false);

    // Таймер зворотного відліку після ставки
    const [countdown, setCountdown] = useState<number | null>(null);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Завершення аукціону
    const [finished, setFinished] = useState(false);
    const [winner, setWinner] = useState<{ accountId: string; amount: number } | null>(null);

    // currentUserId — читаємо з токена, кладемо в стан щоб компонент ре-рендерився
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // ── Читаємо userId один раз при маунті ───────────────────────────────
    useEffect(() => {
        debugToken(); // виводить payload в консоль — відкрий DevTools щоб побачити ключі
        const uid = getCurrentUserId();
        console.log('[LotPage] currentUserId:', uid);
        setCurrentUserId(uid);
    }, []);

    // ── Завантаження лота ─────────────────────────────────────────────────
    useEffect(() => {
        if (!id) return;

        const fetchLot = async () => {
            try {
                const data = await getAuctionLot(id);
                setLot(data);
                setBidAmount(data.currentPrice > 0 ? data.currentPrice + 1 : data.startPrice + 1);
            } catch {
                setError('Не вдалося завантажити дані лота.');
            }
        };

        fetchLot();
    }, [id]);

    // ── Запуск / зупинка таймера відліку ─────────────────────────────────
    const startCountdown = useCallback(() => {
        if (countdownRef.current) clearInterval(countdownRef.current);

        setCountdown(AUCTION_TIMER_SECONDS);

        countdownRef.current = setInterval(() => {
            setCountdown((prev) => {
                if (prev === null || prev <= 1) {
                    clearInterval(countdownRef.current!);
                    return null;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    // ── SignalR підключення до лота ───────────────────────────────────────
    useEffect(() => {
        if (!id) return;
        if (!isAuthenticated()) {
            setSignalRStatus('error');
            return;
        }

        const connect = async () => {
            try {
                await startLotConnection(id);
                setSignalRStatus('connected');

                const conn = getLotConnection(id);
                if (!conn) return;

                conn.on('ReceiveBid', (_lotId: string, accountId: string, amount: number) => {
                    console.log('[SignalR] ReceiveBid:', accountId, amount);
                    setLot((prev) =>
                        prev ? { ...prev, currentPrice: amount, currentWinnerId: accountId } : prev
                    );
                    setBidAmount(amount + 1);
                    startCountdown();
                });

                conn.on('ReceiveFinishLot', (_lotId: string, accountId: string, amount: number) => {
                    console.log('[SignalR] ReceiveFinishLot:', accountId, amount);
                    setFinished(true);
                    setWinner({ accountId, amount });
                    setCountdown(null);
                    if (countdownRef.current) clearInterval(countdownRef.current);
                });

                conn.on('ReceiveDeletedLot', () => {
                    console.log('[SignalR] ReceiveDeletedLot');
                    setError('Цей лот було видалено.');
                    setFinished(true);
                });

                conn.on('Error', (message: string) => {
                    console.warn('[SignalR] Error від сервера:', message);
                    setBidError(message);
                });

            } catch (err) {
                console.error('[LotPage] SignalR connect failed:', err);
                setSignalRStatus('error');
            }
        };

        connect();

        return () => {
            if (countdownRef.current) clearInterval(countdownRef.current);
            const conn = getLotConnection(); // без id — повертає поточне або null
            if (conn) {
                conn.off('ReceiveBid');
                conn.off('ReceiveFinishLot');
                conn.off('ReceiveDeletedLot');
                conn.off('Error');
            }
            stopLotConnection();
        };
    }, [id, startCountdown]);

    // ── Зробити ставку ────────────────────────────────────────────────────
    const handlePlaceBid = async () => {
        if (!lot || !id) return;

        const minBid = lot.currentPrice > 0 ? lot.currentPrice : lot.startPrice;
        if (bidAmount <= minBid) {
            setBidError(`Ставка має бути більше ${minBid} грн`);
            return;
        }

        setBidError('');
        setBidLoading(true);

        try {
            await placeBid(id, bidAmount);
        } catch (err: any) {
            setBidError(err.message ?? 'Помилка при ставці');
        } finally {
            setBidLoading(false);
        }
    };

    // ── Видалення лота ────────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!id || !window.confirm('Видалити цей лот?')) return;

        try {
            await deleteAuctionLot(id);
            navigate('/');
        } catch {
            setError('Помилка при видаленні лота.');
        }
    };

    // ── Рендер ────────────────────────────────────────────────────────────
    if (error) {
        return (
            <div className="p-4">
                <p className="text-red-500">{error}</p>
                <button
                    onClick={() => navigate('/')}
                    className="mt-3 bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300"
                >
                    ← На головну
                </button>
            </div>
        );
    }

    if (!lot) {
        return <div className="p-4 text-gray-500">Завантаження...</div>;
    }

    const isOwner = !!currentUserId && currentUserId === lot.ownerId;
    const canBid = !finished && !isOwner && !!currentUserId;

    return (
        <div className="p-4 max-w-2xl mx-auto">
            <button
                onClick={() => navigate('/')}
                className="text-sm text-blue-500 hover:underline mb-4 inline-block"
            >
                ← Назад до лотів
            </button>

            {/* Заголовок і статус SignalR */}
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold">{lot.name}</h2>
                <span className="text-xs">
                    {signalRStatus === 'connected' && <span className="text-green-500">🟢 Live</span>}
                    {signalRStatus === 'error' && <span className="text-red-400">🔴 Offline</span>}
                    {signalRStatus === 'connecting' && <span className="text-yellow-400">⏳ Підключення...</span>}
                </span>
            </div>

            {/* Фото */}
            {lot.linkToImage ? (
                <img
                    src={lot.linkToImage}
                    alt="Фото лота"
                    style={{ maxWidth: '400px', width: '100%', height: 'auto' }}
                    className="rounded-lg shadow-md mb-4"
                />
            ) : (
                <div className="bg-gray-100 rounded-lg h-48 flex items-center justify-center mb-4 text-gray-400">
                    Зображення відсутнє
                </div>
            )}

            {/* Деталі */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4 space-y-2">
                <p className="text-gray-600">{lot.description}</p>
                <div className="flex gap-6 mt-2">
                    <div>
                        <span className="text-xs text-gray-400">Стартова ціна</span>
                        <p className="text-lg font-semibold">{lot.startPrice} грн</p>
                    </div>
                    <div>
                        <span className="text-xs text-gray-400">Поточна ціна</span>
                        <p className="text-lg font-bold text-blue-600">
                            {lot.currentPrice > 0 ? `${lot.currentPrice} грн` : '—'}
                        </p>
                    </div>
                </div>
                <p className="text-sm text-gray-400">
                    Початок: {parseApiDate(lot.startTime).toLocaleString('uk-UA')}
                </p>
            </div>

            {/* Таймер зворотного відліку */}
            {countdown !== null && !finished && (
                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mb-4 text-center">
                    <p className="text-yellow-700 font-semibold">
                        ⏱ До завершення аукціону: {countdown} сек
                    </p>
                    <p className="text-xs text-yellow-500">Нова ставка скидає таймер</p>
                </div>
            )}

            {/* Аукціон завершено */}
            {finished && (
                <div className="bg-green-50 border border-green-300 rounded-lg p-4 mb-4">
                    <p className="text-green-700 font-bold text-lg">🏆 Аукціон завершено!</p>
                    {winner && (
                        <p className="text-green-600 mt-1">
                            Переможець: <span className="font-semibold">{winner.accountId}</span> зі
                            ставкою <span className="font-semibold">{winner.amount} грн</span>
                        </p>
                    )}
                </div>
            )}

            {/* Форма ставки */}
            {canBid && (
                <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
                    <h3 className="font-semibold mb-3">Зробити ставку</h3>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            value={bidAmount}
                            onChange={(e) => setBidAmount(parseFloat(e.target.value))}
                            min={lot.currentPrice > 0 ? lot.currentPrice + 0.01 : lot.startPrice + 0.01}
                            step={1}
                            className="flex-1 border rounded-md p-2"
                        />
                        <span className="flex items-center text-gray-500">грн</span>
                        <button
                            onClick={handlePlaceBid}
                            disabled={bidLoading || signalRStatus !== 'connected'}
                            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
                        >
                            {bidLoading ? '...' : 'Ставка'}
                        </button>
                    </div>
                    {bidError && <p className="text-red-500 text-sm mt-2">{bidError}</p>}
                    {signalRStatus !== 'connected' && (
                        <p className="text-yellow-600 text-sm mt-2">
                            Очікування live-з'єднання для ставки...
                        </p>
                    )}
                </div>
            )}

            {/* Повідомлення для незалогіненого */}
            {!currentUserId && !finished && (
                <p className="text-gray-500 text-sm mb-4">
                    <a href="/login" className="text-blue-500 hover:underline">Увійдіть</a>, щоб зробити ставку.
                </p>
            )}

            {/* Кнопки власника */}
            {isOwner && (
                <div className="flex gap-3 mt-2">
                    <button
                        onClick={() => navigate(`/lot/${id}/edit`)}
                        className="bg-yellow-400 text-white px-4 py-2 rounded-md hover:bg-yellow-500"
                    >
                        Редагувати
                    </button>
                    <button
                        onClick={handleDelete}
                        className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
                    >
                        Видалити
                    </button>
                </div>
            )}
        </div>
    );
};

export default LotPage;
