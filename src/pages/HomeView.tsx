import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lot } from '../model/Lot';
import { getActiveAuctionsLots } from '../services/auction-api';
import { parseUtcApiDate } from '../services/date-time';
import { getApiErrorMessage } from '../services/error-message';
import { isAuthenticated } from '../services/identity-api';
import {
    DeletedLotEvent,
    NewLotEvent,
    getLobbyConnection,
    startLobbyConnection,
    stopLobbyConnection,
} from '../services/signalr-client';

const HomeView: React.FC = () => {
    const navigate = useNavigate();
    const [lots, setLots] = useState<Lot[]>([]);
    const [error, setError] = useState('');
    const [signalStatus, setSignalStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getActiveAuctionsLots();
                setLots(data);
            } catch (e) {
                setError(getApiErrorMessage(e, 'Не вдалося отримати список лотів.'));
            }
        };

        load();
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

        connect();

        return () => {
            isDisposed = true;
            const conn = getLobbyConnection();
            conn?.off('ReceiveNewLot');
            conn?.off('ReceiveDeletedLot');
            void stopLobbyConnection();
        };
    }, []);

    return (
        <>
            <section className="page-head">
                <div>
                    <h1 className="page-title">Аукціони наживо</h1>
                    <p className="muted">Лоти синхронізуються в реальному часі через SignalR.</p>
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/create-lot')}>
                    + Новий лот
                </button>
            </section>

            <div className="status-line">
                {signalStatus === 'connecting' && <span className="status-warn">Підключення live-каналу...</span>}
                {signalStatus === 'connected' && <span className="status-ok">Live-канал активний</span>}
                {signalStatus === 'error' && <span className="status-bad">Live-канал недоступний</span>}
            </div>

            {error && <div className="error-box">{error}</div>}

            {lots.length === 0 ? (
                <div className="surface padded muted">Поки немає активних лотів.</div>
            ) : (
                <section className="lots-grid">
                    {lots.map((lot) => (
                        <article key={lot.id} className="lot-card">
                            <div>
                                <h3>{lot.name}</h3>
                                <p className="muted" style={{ margin: '0.3rem 0 0' }}>
                                    Початок: {parseUtcApiDate(lot.startTime).toLocaleString('uk-UA')}
                                </p>
                            </div>
                            <div className="lot-prices">
                                <span><strong>Старт:</strong> {lot.startPrice} грн</span>
                                <span><strong>Поточна:</strong> {lot.currentPrice || lot.startPrice} грн</span>
                            </div>
                            <button className="btn btn-accent" onClick={() => navigate(`/lot/${lot.id}`)}>
                                До лота
                            </button>
                        </article>
                    ))}
                </section>
            )}
        </>
    );
};

export default HomeView;
