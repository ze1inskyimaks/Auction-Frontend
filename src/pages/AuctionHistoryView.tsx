import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lot } from '../model/Lot';
import { getArchivedAuctionsLots } from '../services/auction-api';
import { parseUtcApiDate } from '../services/date-time';
import { getApiErrorMessage } from '../services/error-message';

const statusLabel = (status: number): string => {
    if (status === 2) return 'Продано';
    if (status === 3) return 'Скасовано';
    if (status === 4) return 'Доставлено';
    return 'Завершено';
};

const AuctionHistoryView: React.FC = () => {
    const navigate = useNavigate();
    const [lots, setLots] = useState<Lot[]>([]);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getArchivedAuctionsLots();
                setLots(data);
            } catch (e) {
                setError(getApiErrorMessage(e, 'Не вдалося завантажити історію аукціонів.'));
            }
        };

        load();
    }, []);

    return (
        <>
            <section className="page-head">
                <div>
                    <h1 className="page-title">Історія аукціонів</h1>
                    <p className="muted">Публічний архів завершених лотів: переможці, фінальні ціни та таймлайн ставок.</p>
                </div>
                <Link to="/" className="btn btn-ghost">← Назад до активних</Link>
            </section>

            {error && <div className="error-box">{error}</div>}

            {lots.length === 0 ? (
                <div className="surface padded muted">Архів поки порожній.</div>
            ) : (
                <section className="lots-grid">
                    {lots.map((lot) => (
                        <article key={lot.id} className="lot-card">
                            <div>
                                <h3>{lot.name}</h3>
                                <p className="muted" style={{ margin: '0.3rem 0 0' }}>
                                    Статус: {statusLabel(lot.status)}
                                </p>
                            </div>

                            <div className="lot-prices">
                                <span><strong>Старт:</strong> {lot.startPrice.toFixed(2)} грн</span>
                                <span><strong>Фінал:</strong> {(lot.endPrice || lot.currentPrice || lot.startPrice).toFixed(2)} грн</span>
                            </div>

                            <p className="muted" style={{ margin: 0 }}>
                                Початок: {parseUtcApiDate(lot.startTime).toLocaleString('uk-UA')}
                            </p>
                            <p className="muted" style={{ margin: 0 }}>
                                Переможець: {lot.winnerId ?? 'немає'}
                            </p>

                            <div className="inline-row">
                                <button className="btn btn-accent" onClick={() => navigate(`/lot/${lot.id}`)}>
                                    Деталі
                                </button>
                            </div>
                        </article>
                    ))}
                </section>
            )}
        </>
    );
};

export default AuctionHistoryView;
