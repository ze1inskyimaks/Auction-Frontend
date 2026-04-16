import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lot } from '../model/Lot';
import { getActiveAuctionsLots } from '../services/auction-api';
import { Category, getCategories } from '../services/categories-api';
import { parseUtcApiDate } from '../services/date-time';
import { getApiErrorMessage } from '../services/error-message';
import { isAuthenticated, isUser } from '../services/identity-api';
import {
    DeletedLotEvent,
    NewLotEvent,
    getLobbyConnection,
    startLobbyConnection,
    stopLobbyConnection,
} from '../services/signalr-client';

type StartFilter = 'all' | 'started' | 'upcoming';

const HomeView: React.FC = () => {
    const navigate = useNavigate();
    const [lots, setLots] = useState<Lot[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [error, setError] = useState('');
    const [signalStatus, setSignalStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
    const [searchQuery, setSearchQuery] = useState('');
    const [startFilter, setStartFilter] = useState<StartFilter>('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const canCreateLot = isAuthenticated() && isUser();

    useEffect(() => {
        const load = async () => {
            try {
                const [lotsData, categoriesData] = await Promise.all([
                    getActiveAuctionsLots(),
                    getCategories(),
                ]);
                setLots(lotsData);
                setCategories(categoriesData);
            } catch (e) {
                setError(getApiErrorMessage(e, 'Не вдалося отримати список лотів.'));
            }
        };

        void load();
    }, []);

    useEffect(() => {
        if (!isAuthenticated()) {
            setSignalStatus('error');
            return;
        }

        let isDisposed = false;

        const connect = async () => {
            try {
                await startLobbyConnection();
                if (isDisposed) {
                    return;
                }
                const conn = getLobbyConnection();
                if (!conn) {
                    setSignalStatus('error');
                    return;
                }

                setSignalStatus('connected');

                conn.on('ReceiveNewLot', (event: NewLotEvent) => {
                    setLots((prev) => {
                        const existing = prev.find((x) => x.id === event.id);
                        if (existing) {
                            return prev.map((x) =>
                                x.id === event.id ? { ...x, name: event.name, startPrice: event.startPrice } : x
                            );
                        }

                        return [
                            ...prev,
                            {
                                id: event.id,
                                name: event.name,
                                description: '',
                                startPrice: event.startPrice,
                                startTime: new Date().toISOString(),
                                ownerId: '',
                                currentWinnerId: null,
                                currentPrice: event.startPrice,
                                lastBitTime: '',
                                auctionHistoryId: null,
                                endPrice: 0,
                                winnerId: null,
                                status: 0,
                                updatedAt: '',
                                createdAt: '',
                            },
                        ];
                    });
                });

                conn.on('ReceiveDeletedLot', (event: DeletedLotEvent) => {
                    setLots((prev) => prev.filter((x) => x.id !== event.id));
                });
            } catch {
                if (!isDisposed) {
                    setSignalStatus('error');
                }
            }
        };

        void connect();

        return () => {
            isDisposed = true;
            const conn = getLobbyConnection();
            conn?.off('ReceiveNewLot');
            conn?.off('ReceiveDeletedLot');
            void stopLobbyConnection();
        };
    }, []);

    const categoryOptions = useMemo(() => {
        const map = new Map<string, string>();
        categories.forEach((category) => map.set(category.id, category.name));
        lots.forEach((lot) => {
            if (lot.categoryId && lot.categoryName && !map.has(lot.categoryId)) {
                map.set(lot.categoryId, lot.categoryName);
            }
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [categories, lots]);

    const filteredLots = useMemo(() => {
        const now = new Date();
        const normalizedQuery = searchQuery.trim().toLowerCase();

        return lots.filter((lot) => {
            const lotStart = parseUtcApiDate(lot.startTime);
            const isStarted = lotStart <= now;

            if (startFilter === 'started' && !isStarted) {
                return false;
            }
            if (startFilter === 'upcoming' && isStarted) {
                return false;
            }

            if (categoryFilter !== 'all' && lot.categoryId !== categoryFilter) {
                return false;
            }

            if (!normalizedQuery) {
                return true;
            }

            const haystack = `${lot.name} ${lot.description ?? ''} ${lot.categoryName ?? ''}`.toLowerCase();
            return haystack.includes(normalizedQuery);
        });
    }, [lots, searchQuery, startFilter, categoryFilter]);

    return (
        <>
            <section className="page-head">
                <div>
                    <h1 className="page-title">Аукціони наживо</h1>
                    <p className="muted">Лоти синхронізуються в реальному часі через SignalR.</p>
                </div>
                {canCreateLot && (
                    <button className="btn btn-primary" onClick={() => navigate('/create-lot')}>
                        + Новий лот
                    </button>
                )}
            </section>

            <section className="surface padded filters-bar">
                <div className="filters-grid">
                    <div className="field">
                        <label className="label">Пошук</label>
                        <input
                            className="input"
                            placeholder="Назва, опис або категорія"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="field">
                        <label className="label">Статус старту</label>
                        <select
                            className="input"
                            value={startFilter}
                            onChange={(e) => setStartFilter(e.target.value as StartFilter)}
                        >
                            <option value="all">Усі</option>
                            <option value="started">Вже стартували</option>
                            <option value="upcoming">Ще не відкриті</option>
                        </select>
                    </div>

                    <div className="field">
                        <label className="label">Категорія</label>
                        <select
                            className="input"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                        >
                            <option value="all">Усі категорії</option>
                            {categoryOptions.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </section>

            <div className="status-line">
                {signalStatus === 'connecting' && <span className="status-warn">Підключення live-каналу...</span>}
                {signalStatus === 'connected' && <span className="status-ok">Live-канал активний</span>}
                {signalStatus === 'error' && <span className="status-bad">Live-канал недоступний</span>}
            </div>

            {error && <div className="error-box">{error}</div>}

            {filteredLots.length === 0 ? (
                <div className="surface padded muted">За поточними фільтрами лоти не знайдено.</div>
            ) : (
                <section className="lots-grid">
                    {filteredLots.map((lot) => {
                        const startAt = parseUtcApiDate(lot.startTime);
                        const isStarted = startAt <= new Date();

                        return (
                            <article key={lot.id} className="lot-card">
                                <div>
                                    <h3>{lot.name}</h3>
                                    {lot.categoryName && (
                                        <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                                            Категорія: {lot.categoryName}
                                        </p>
                                    )}
                                    <p className="muted" style={{ margin: '0.3rem 0 0' }}>
                                        Початок: {startAt.toLocaleString('uk-UA')}
                                    </p>
                                </div>
                                <div className="lot-prices">
                                    <span><strong>Старт:</strong> {lot.startPrice} грн</span>
                                    <span><strong>Поточна:</strong> {lot.currentPrice || lot.startPrice} грн</span>
                                    <span><strong>Стан:</strong> {isStarted ? 'Вже стартував' : 'Ще не відкритий'}</span>
                                </div>
                                <button className="btn btn-accent" onClick={() => navigate(`/lot/${lot.id}`)}>
                                    До лота
                                </button>
                            </article>
                        );
                    })}
                </section>
            )}
        </>
    );
};

export default HomeView;
