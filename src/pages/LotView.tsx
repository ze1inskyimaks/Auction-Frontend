import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LotHistoryItem, deleteAuctionLot, getAuctionLot, getAuctionLotHistory } from '../services/auction-api';
import { parseUtcApiDate } from '../services/date-time';
import { getApiErrorMessage } from '../services/error-message';
import { getCurrentUserId, isAuthenticated } from '../services/identity-api';
import {
    getLotConnection,
    placeBid,
    startLotConnection,
    stopLotConnection,
} from '../services/signalr-client';
import { Lot } from '../model/Lot';

const TIMER_SECONDS = 15;
const MIN_BID_STEP = 1;

const getMinimumBid = (basePrice: number): number => {
    const step = Math.max(MIN_BID_STEP, Number((basePrice * 0.01).toFixed(2)));
    return Number((basePrice + step).toFixed(2));
};

const LotView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [lot, setLot] = useState<Lot | null>(null);
    const [error, setError] = useState('');
    const [bidError, setBidError] = useState('');
    const [bidAmount, setBidAmount] = useState(0);
    const [signalStatus, setSignalStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
    const [finished, setFinished] = useState(false);
    const [winner, setWinner] = useState<{ accountId: string; amount: number } | null>(null);
    const [counter, setCounter] = useState<number | null>(null);
    const [history, setHistory] = useState<LotHistoryItem[]>([]);
    const currentUserId = getCurrentUserId();
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const isOwner = useMemo(() => !!currentUserId && lot?.ownerId === currentUserId, [currentUserId, lot?.ownerId]);
    const isCurrentWinner = useMemo(
        () => !!currentUserId && !!lot?.currentWinnerId && String(lot.currentWinnerId) === currentUserId,
        [currentUserId, lot?.currentWinnerId]
    );

    useEffect(() => {
        if (!id) return;

        const load = async () => {
            try {
                const [data, historyData] = await Promise.all([
                    getAuctionLot(id),
                    getAuctionLotHistory(id),
                ]);
                setLot(data);
                setHistory(historyData);
                setBidAmount(getMinimumBid(data.currentPrice || data.startPrice));
                if (data.status === 2 && data.winnerId) {
                    setFinished(true);
                    setWinner({ accountId: data.winnerId, amount: data.endPrice });
                }
            } catch (e) {
                setError(getApiErrorMessage(e, 'Не вдалося завантажити лот.'));
            }
        };

        load();
    }, [id]);

    useEffect(() => {
        if (!id || !isAuthenticated()) {
            setSignalStatus('error');
            return;
        }

        let isDisposed = false;

        const connect = async () => {
            try {
                await startLotConnection(id);
                if (isDisposed) {
                    return;
                }
                const conn = getLotConnection(id);
                if (!conn) {
                    setSignalStatus('error');
                    return;
                }

                setSignalStatus('connected');

                conn.on('ReceiveBid', (_lotId: string, accountId: string, amount: number) => {
                    setLot((prev) => (prev ? { ...prev, currentPrice: amount, currentWinnerId: accountId } : prev));
                    setBidAmount(getMinimumBid(amount));
                    setHistory((prev) => {
                        const topNumber = prev[0]?.historyNumber ?? 0;
                        const nextNumber = topNumber + 1;
                        return [
                            {
                                id: `live-${Date.now()}-${accountId}`,
                                lotId: id,
                                historyNumber: nextNumber,
                                bidderId: accountId,
                                bidAmount: amount,
                                bidTime: new Date().toISOString(),
                            },
                            ...prev,
                        ];
                    });
                    setCounter(TIMER_SECONDS);

                    if (timerRef.current) clearInterval(timerRef.current);
                    timerRef.current = setInterval(() => {
                        setCounter((prev) => {
                            if (!prev || prev <= 1) {
                                if (timerRef.current) clearInterval(timerRef.current);
                                return null;
                            }
                            return prev - 1;
                        });
                    }, 1000);
                });

                conn.on('ReceiveFinishLot', (_lotId: string, accountId: string, amount: number) => {
                    setFinished(true);
                    setWinner({ accountId, amount });
                    setLot((prev) =>
                        prev
                            ? {
                                ...prev,
                                status: 2,
                                winnerId: accountId,
                                endPrice: amount,
                            }
                            : prev
                    );
                    setCounter(null);
                    if (timerRef.current) clearInterval(timerRef.current);
                });

                conn.on('ReceiveDeletedLot', () => {
                    setError('Лот було видалено.');
                });

                conn.on('Error', (message: string) => {
                    setBidError(message);
                });
            } catch {
                if (!isDisposed) {
                    setSignalStatus('error');
                }
            }
        };

        connect();

        return () => {
            isDisposed = true;
            const conn = getLotConnection();
            conn?.off('ReceiveBid');
            conn?.off('ReceiveFinishLot');
            conn?.off('ReceiveDeletedLot');
            conn?.off('Error');
            void stopLotConnection();
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [id]);

    const onBid = async () => {
        if (!id || !lot) return;
        if (isCurrentWinner) {
            setBidError('Ви вже маєте найвищу ставку. Дочекайтесь, поки вас переб’ють.');
            return;
        }

        const minBid = getMinimumBid(lot.currentPrice || lot.startPrice);
        if (bidAmount < minBid) {
            setBidError(`Ставка має бути не меншою за ${minBid.toFixed(2)} грн`);
            return;
        }

        try {
            setBidError('');
            await placeBid(id, bidAmount);
        } catch (e) {
            setBidError(getApiErrorMessage(e, 'Не вдалося зробити ставку.'));
        }
    };

    const onDelete = async () => {
        if (!id) return;
        if (!window.confirm('Видалити цей лот?')) return;

        try {
            await deleteAuctionLot(id);
            navigate('/');
        } catch (e) {
            setError(getApiErrorMessage(e, 'Не вдалося видалити лот.'));
        }
    };

    if (error) {
        return (
            <div className="surface padded">
                <div className="error-box">{error}</div>
                <button className="btn btn-ghost" onClick={() => navigate('/')}>На головну</button>
            </div>
        );
    }

    if (!lot) {
        return <div className="surface padded muted">Завантаження лота...</div>;
    }

    return (
        <>
            <section className="page-head">
                <div>
                    <h1 className="page-title">{lot.name}</h1>
                    <p className="muted">Початок: {parseUtcApiDate(lot.startTime).toLocaleString('uk-UA')}</p>
                </div>
                <Link to="/" className="btn btn-ghost">← До списку</Link>
            </section>

            <div className="status-line">
                {signalStatus === 'connected' && <span className="status-ok">Live підключено</span>}
                {signalStatus === 'connecting' && <span className="status-warn">Підключення live...</span>}
                {signalStatus === 'error' && <span className="status-bad">Live недоступний</span>}
            </div>

            <section className="lot-layout">
                <article className="surface padded">
                    {lot.linkToImage ? (
                        <img className="lot-image" src={lot.linkToImage} alt={lot.name} />
                    ) : (
                        <div className="surface padded muted">Зображення відсутнє</div>
                    )}
                    <p style={{ marginTop: '0.9rem' }}>{lot.description || 'Опис відсутній.'}</p>

                    <div className="surface padded" style={{ marginTop: '1rem' }}>
                        <strong>Історія ставок</strong>
                        {history.length === 0 ? (
                            <p className="muted" style={{ marginTop: '0.6rem' }}>Поки що ставок немає.</p>
                        ) : (
                            <div style={{ marginTop: '0.6rem' }}>
                                {history.map((item) => (
                                    <div key={item.id} className="inline-row" style={{ justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                                        <span>#{item.historyNumber ?? '-'} · {item.bidderId}</span>
                                        <span>{item.bidAmount.toFixed(2)} грн · {parseUtcApiDate(item.bidTime).toLocaleString('uk-UA')}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </article>

                <aside className="surface padded lot-meta">
                    <div className="inline-row">
                        <span className="pill">Старт {lot.startPrice} грн</span>
                        <span className="pill">Поточна {lot.currentPrice || lot.startPrice} грн</span>
                    </div>

                    {counter !== null && !finished && (
                        <div className="countdown">До завершення торгів: {counter} с</div>
                    )}

                    {finished && winner && (
                        <div className="surface padded">
                            <strong>Аукціон завершено</strong>
                            <p className="muted">Переможець: {winner.accountId}</p>
                            <p className="muted">Ставка: {winner.amount} грн</p>
                        </div>
                    )}

                    {!isOwner && isAuthenticated() && !finished && (
                        <div>
                            <label className="label">Ваша ставка (грн)</label>
                            <div className="inline-row">
                                <input
                                    className="input"
                                    type="number"
                                    min={getMinimumBid(lot.currentPrice || lot.startPrice)}
                                    step={0.01}
                                    value={bidAmount}
                                    onChange={(e) => setBidAmount(Number(e.target.value))}
                                    disabled={isCurrentWinner}
                                />
                                <button className="btn btn-primary" onClick={onBid} disabled={isCurrentWinner}>
                                    Ставка
                                </button>
                            </div>
                            {isCurrentWinner && (
                                <p className="muted" style={{ marginTop: '0.6rem' }}>
                                    Ви лідируєте. Повторна ставка буде доступна, коли вас переб’ють.
                                </p>
                            )}
                            {bidError && <div className="error-box" style={{ marginTop: '0.6rem' }}>{bidError}</div>}
                        </div>
                    )}

                    {!isAuthenticated() && !finished && (
                        <p className="muted">Щоб ставити ставки, <Link to="/login">увійди в акаунт</Link>.</p>
                    )}

                    {isOwner && (
                        <div className="inline-row">
                            <button className="btn btn-accent" onClick={() => navigate(`/lot/${id}/edit`)}>Редагувати</button>
                            <button className="btn btn-danger" onClick={onDelete}>Видалити</button>
                        </div>
                    )}
                </aside>
            </section>
        </>
    );
};

export default LotView;
