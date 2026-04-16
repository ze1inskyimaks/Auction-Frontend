import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    LotHistoryItem,
    cancelAuctionLotDelivery,
    deleteAuctionLot,
    getAuctionLot,
    getAuctionLotHistory,
    markAuctionLotAsDelivered,
} from '../services/auction-api';
import { parseUtcApiDate } from '../services/date-time';
import { getApiErrorMessage } from '../services/error-message';
import { resolveImageUrl } from '../services/image-url';
import {
    UserContactProfile,
    getCurrentUserId,
    getCurrentUserRoles,
    getUserContactProfileForAdmin,
    isAuthenticated,
} from '../services/identity-api';
import { getLotConnection, placeBid, startLotConnection, stopLotConnection } from '../services/signalr-client';
import { Lot } from '../model/Lot';

const TIMER_SECONDS = 15;
const MIN_BID_STEP = 1;

const getMinimumBid = (basePrice: number): number => {
    const step = Math.max(MIN_BID_STEP, Number((basePrice * 0.01).toFixed(2)));
    return Number((basePrice + step).toFixed(2));
};

const statusLabel = (status: number): string => {
    if (status === 0) return 'Активний';
    if (status === 1) return 'Відкритий';
    if (status === 2) return 'Завершений';
    if (status === 3) return 'Скасований';
    if (status === 4) return 'Доставлений';
    return 'Невідомо';
};

const shortId = (value: string | null | undefined): string => {
    if (!value) return '—';
    if (value.length <= 10) return value;
    return `${value.slice(0, 8)}...`;
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
    const [selectedContact, setSelectedContact] = useState<UserContactProfile | null>(null);
    const [selectedContactLabel, setSelectedContactLabel] = useState('');
    const [contactLoading, setContactLoading] = useState(false);

    const currentUserId = getCurrentUserId();
    const roles = getCurrentUserRoles().map((r) => String(r).toUpperCase());
    const isAdmin = roles.includes('ADMIN');
    const canBid = roles.includes('USER');
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
                const [data, historyData] = await Promise.all([getAuctionLot(id), getAuctionLotHistory(id)]);
                setLot(data);
                setHistory(historyData);
                setBidAmount(getMinimumBid(data.currentPrice || data.startPrice));
                if ((data.status === 2 || data.status === 4) && data.winnerId) {
                    setFinished(true);
                    setWinner({ accountId: data.winnerId, amount: data.endPrice });
                }
            } catch (e) {
                setError(getApiErrorMessage(e, 'Не вдалося завантажити лот.'));
            }
        };

        void load();
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
                if (isDisposed) return;

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
                        return [
                            {
                                id: `live-${Date.now()}-${accountId}`,
                                lotId: id,
                                historyNumber: topNumber + 1,
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
                    setLot((prev) => (prev ? { ...prev, status: 2, winnerId: accountId, endPrice: amount } : prev));
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
                if (!isDisposed) setSignalStatus('error');
            }
        };

        void connect();

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
        if (!canBid) {
            setBidError('Ваш акаунт не має права робити ставки.');
            return;
        }
        if (isCurrentWinner) {
            setBidError('Ви вже маєте найвищу ставку. Дочекайтесь, поки вас перебʼють.');
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

    const onMarkAsDelivered = async () => {
        if (!id || !lot || !isAdmin) return;

        try {
            const updated = await markAuctionLotAsDelivered(id);
            setLot(updated);
            if (updated.status === 4) setFinished(true);
        } catch (e) {
            setError(getApiErrorMessage(e, 'Не вдалося позначити лот як доставлений.'));
        }
    };

    const onCancelDelivery = async () => {
        if (!id || !lot || !isAdmin) return;

        try {
            const updated = await cancelAuctionLotDelivery(id);
            setLot(updated);
            if (updated.status === 2) setFinished(true);
        } catch (e) {
            setError(getApiErrorMessage(e, 'Не вдалося скасувати статус доставки.'));
        }
    };

    const onLoadContactProfile = async (userId: string | null | undefined, label: string) => {
        if (!isAdmin || !userId) return;

        try {
            setContactLoading(true);
            const profile = await getUserContactProfileForAdmin(userId);
            setSelectedContact(profile);
            setSelectedContactLabel(label);
        } catch (e) {
            setError(getApiErrorMessage(e, 'Не вдалося завантажити контактну інформацію користувача.'));
        } finally {
            setContactLoading(false);
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

    const currentPrice = lot.currentPrice || lot.startPrice;
    const minBid = getMinimumBid(currentPrice);

    return (
        <section className="lot-page">
            <section className="page-head">
                <div>
                    <h1 className="page-title">{lot.name}</h1>
                    <div className="lot-head-meta">
                        {lot.categoryName && <span className="pill">Категорія: {lot.categoryName}</span>}
                        <span className="pill">Статус: {statusLabel(lot.status)}</span>
                    </div>
                    <p className="muted">Початок: {parseUtcApiDate(lot.startTime).toLocaleString('uk-UA')}</p>
                </div>
                <Link to="/" className="btn btn-ghost">← До списку</Link>
            </section>

            <div className="status-line">
                {signalStatus === 'connected' && <span className="status-ok">Live підключено</span>}
                {signalStatus === 'connecting' && <span className="status-warn">Підключення live-каналу...</span>}
                {signalStatus === 'error' && <span className="status-bad">Live-канал недоступний</span>}
            </div>

            <section className="lot-layout">
                <article className="surface padded">
                    <div className="lot-image-wrap">
                        {lot.linkToImage ? (
                            <img className="lot-image" src={resolveImageUrl(lot.linkToImage)} alt={lot.name} />
                        ) : (
                            <div className="lot-image-empty">Зображення відсутнє</div>
                        )}
                    </div>

                    <div className="lot-block">
                        <h3 className="lot-section-title">Опис</h3>
                        <p>{lot.description || 'Опис відсутній.'}</p>
                    </div>

                    <div className="lot-block">
                        <h3 className="lot-section-title">Історія ставок</h3>
                        {history.length === 0 ? (
                            <p className="muted">Поки що ставок не було.</p>
                        ) : (
                            <div>
                                {history.map((item) => (
                                    <div key={item.id} className="history-row">
                                        <span>#{item.historyNumber ?? '-'} · {shortId(item.bidderId)}</span>
                                        <span>{item.bidAmount.toFixed(2)} грн · {parseUtcApiDate(item.bidTime).toLocaleString('uk-UA')}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </article>

                <aside className="surface padded lot-meta">
                    <div className="inline-row">
                        <span className="pill">Старт: {lot.startPrice.toFixed(2)} грн</span>
                        <span className="pill">Поточна: {currentPrice.toFixed(2)} грн</span>
                    </div>

                    {counter !== null && !finished && (
                        <div className="countdown">До завершення торгів: {counter} с</div>
                    )}

                    {finished && winner && (
                        <div className="surface padded">
                            <strong>Аукціон завершено</strong>
                            <p className="muted">Переможець: {shortId(winner.accountId)}</p>
                            <p className="muted">Фінальна ставка: {winner.amount.toFixed(2)} грн</p>
                        </div>
                    )}

                    {!isOwner && isAuthenticated() && canBid && !finished && (
                        <div className="lot-block">
                            <label className="label">Ваша ставка (мін. {minBid.toFixed(2)} грн)</label>
                            <div className="inline-row">
                                <input
                                    className="input"
                                    type="number"
                                    min={minBid}
                                    step={0.01}
                                    value={bidAmount}
                                    onChange={(e) => setBidAmount(Number(e.target.value))}
                                    disabled={isCurrentWinner || !canBid}
                                />
                                <button className="btn btn-primary" onClick={onBid} disabled={isCurrentWinner || !canBid}>
                                    Ставка
                                </button>
                            </div>
                            {isCurrentWinner && <p className="muted">Ви лідируєте. Очікуйте нову ставку від інших учасників.</p>}
                            {bidError && <div className="error-box" style={{ marginTop: '0.6rem' }}>{bidError}</div>}
                        </div>
                    )}

                    {!isAuthenticated() && !finished && (
                        <p className="muted">Щоб ставити ставки, <Link to="/login">увійдіть в акаунт</Link>.</p>
                    )}

                    {isAuthenticated() && !canBid && (
                        <p className="muted">Для ролі ADMIN ставки недоступні. Ви можете переглядати та адмініструвати лоти.</p>
                    )}

                    {isAdmin && lot.status === 2 && (
                        <button className="btn btn-primary" onClick={onMarkAsDelivered}>Позначити як доставлений</button>
                    )}

                    {isAdmin && lot.status === 4 && (
                        <button className="btn btn-ghost" onClick={onCancelDelivery}>Скасувати доставку</button>
                    )}

                    {isAdmin && (
                        <div className="surface padded lot-block">
                            <strong>Контакти для відправки</strong>
                            <div className="inline-row" style={{ marginTop: '0.65rem' }}>
                                <button
                                    className="btn btn-ghost"
                                    onClick={() => onLoadContactProfile(lot.ownerId, 'Продавець')}
                                    disabled={contactLoading}
                                >
                                    Контакт продавця
                                </button>
                                <button
                                    className="btn btn-ghost"
                                    onClick={() => onLoadContactProfile(lot.winnerId, 'Покупець')}
                                    disabled={contactLoading || !lot.winnerId}
                                >
                                    Контакт покупця
                                </button>
                            </div>

                            {selectedContact && (
                                <div style={{ marginTop: '0.7rem' }}>
                                    <p className="muted" style={{ margin: 0 }}><strong>{selectedContactLabel}</strong></p>
                                    <p className="muted" style={{ margin: 0 }}>ID: {selectedContact.id}</p>
                                    <p className="muted" style={{ margin: 0 }}>Імʼя: {selectedContact.userName ?? '—'}</p>
                                    <p className="muted" style={{ margin: 0 }}>Email: {selectedContact.email ?? '—'}</p>
                                    <p className="muted" style={{ margin: 0 }}>Телефон: {selectedContact.phoneNumber ?? '—'}</p>
                                    <p className="muted" style={{ margin: 0 }}>Ролі: {selectedContact.roles.join(', ') || '—'}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {isOwner && (
                        <div className="inline-row">
                            <button className="btn btn-accent" onClick={() => navigate(`/lot/${id}/edit`)}>Редагувати</button>
                            <button className="btn btn-danger" onClick={onDelete}>Видалити</button>
                        </div>
                    )}
                </aside>
            </section>
        </section>
    );
};

export default LotView;
