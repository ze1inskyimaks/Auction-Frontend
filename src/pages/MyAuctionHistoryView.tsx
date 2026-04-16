import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Lot } from '../model/Lot';
import { MyBidHistoryItem, getMyBidHistory, getMyHostedHistory, getMyWinsHistory } from '../services/auction-api';
import { parseUtcApiDate } from '../services/date-time';
import { getApiErrorMessage } from '../services/error-message';
import { isAuthenticated } from '../services/identity-api';

type TabType = 'bids' | 'wins' | 'hosted';

const lotStatusLabel = (status: number): string => {
    if (status === 0) return 'Активний';
    if (status === 1) return 'Відкритий';
    if (status === 2) return 'Завершений';
    if (status === 3) return 'Скасований';
    if (status === 4) return 'Доставлений';
    return 'Невідомо';
};

const MyAuctionHistoryView: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const tabFromQuery = searchParams.get('tab');
    const initialTab = (tabFromQuery === 'wins' || tabFromQuery === 'hosted' ? tabFromQuery : 'bids') as TabType;

    const [activeTab, setActiveTab] = useState<TabType>(initialTab);
    const [bids, setBids] = useState<MyBidHistoryItem[]>([]);
    const [wins, setWins] = useState<Lot[]>([]);
    const [hosted, setHosted] = useState<Lot[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    const isIgnorableHistoryError = (e: any): boolean => {
        const status = e?.response?.status;
        return status === 403 || status === 404;
    };

    useEffect(() => {
        if (!isAuthenticated()) {
            setLoading(false);
            return;
        }

        const load = async () => {
            try {
                setLoading(true);
                setError('');

                const [bidsResult, winsResult, hostedResult] = await Promise.allSettled([
                    getMyBidHistory(),
                    getMyWinsHistory(),
                    getMyHostedHistory(),
                ]);

                if (bidsResult.status === 'fulfilled') {
                    setBids(bidsResult.value);
                } else if (!isIgnorableHistoryError(bidsResult.reason)) {
                    setError(getApiErrorMessage(bidsResult.reason, 'Не вдалося завантажити історію ставок.'));
                }

                if (winsResult.status === 'fulfilled') {
                    setWins(winsResult.value);
                } else if (!isIgnorableHistoryError(winsResult.reason)) {
                    setError((prev) =>
                        prev || getApiErrorMessage(winsResult.reason, 'Не вдалося завантажити історію виграшів.')
                    );
                }

                if (hostedResult.status === 'fulfilled') {
                    setHosted(hostedResult.value);
                } else if (!isIgnorableHistoryError(hostedResult.reason)) {
                    setError((prev) =>
                        prev || getApiErrorMessage(hostedResult.reason, 'Не вдалося завантажити історію створених лотів.')
                    );
                }
            } finally {
                setLoading(false);
            }
        };

        void load();
    }, []);

    const switchTab = (tab: TabType) => {
        setActiveTab(tab);
        setSearchParams({ tab });
    };

    if (!isAuthenticated()) {
        return (
            <section className="surface padded">
                <h1 className="page-title">Моя історія</h1>
                <p className="muted">Щоб переглянути персональну історію ставок, виграшів і створених лотів, увійдіть в акаунт.</p>
                <Link to="/login" className="btn btn-primary">Увійти</Link>
            </section>
        );
    }

    return (
        <>
            <section className="page-head">
                <div>
                    <h1 className="page-title">Моя історія аукціонів</h1>
                    <p className="muted">Окремо по ставках, виграшах і створених вами лотах.</p>
                </div>
            </section>

            <div className="inline-row" style={{ marginBottom: '1rem' }}>
                <button className={`btn ${activeTab === 'bids' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => switchTab('bids')}>
                    Мої ставки
                </button>
                <button className={`btn ${activeTab === 'wins' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => switchTab('wins')}>
                    Мої виграші
                </button>
                <button className={`btn ${activeTab === 'hosted' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => switchTab('hosted')}>
                    Мої створені лоти
                </button>
            </div>

            {error && <div className="error-box">{error}</div>}

            {loading ? (
                <div className="surface padded muted">Завантаження історії...</div>
            ) : activeTab === 'bids' ? (
                bids.length === 0 ? (
                    <div className="surface padded muted">У вас поки немає ставок.</div>
                ) : (
                    <section className="lots-grid">
                        {bids.map((item) => (
                            <article key={item.id} className="lot-card">
                                <h3>{item.lotName}</h3>
                                <p className="muted" style={{ margin: 0 }}>
                                    Ставка #{item.historyNumber ?? '-'}: {item.bidAmount.toFixed(2)} грн
                                </p>
                                <p className="muted" style={{ margin: 0 }}>
                                    Час: {parseUtcApiDate(item.bidTime).toLocaleString('uk-UA')}
                                </p>
                                <p className="muted" style={{ margin: 0 }}>
                                    Фінал лота: {item.lotEndPrice ? item.lotEndPrice.toFixed(2) : '—'} грн
                                </p>
                                <Link className="btn btn-accent" to={`/lot/${item.lotId}`}>Перейти до лота</Link>
                            </article>
                        ))}
                    </section>
                )
            ) : activeTab === 'wins' ? (
                wins.length === 0 ? (
                    <div className="surface padded muted">Поки що немає виграних лотів.</div>
                ) : (
                    <section className="lots-grid">
                        {wins.map((lot) => (
                            <article key={lot.id} className="lot-card">
                                <h3>{lot.name}</h3>
                                <p className="muted" style={{ margin: 0 }}>
                                    Виграшна ставка: {(lot.endPrice || lot.currentPrice || lot.startPrice).toFixed(2)} грн
                                </p>
                                <p className="muted" style={{ margin: 0 }}>
                                    Початок: {parseUtcApiDate(lot.startTime).toLocaleString('uk-UA')}
                                </p>
                                <Link className="btn btn-accent" to={`/lot/${lot.id}`}>Перейти до лота</Link>
                            </article>
                        ))}
                    </section>
                )
            ) : hosted.length === 0 ? (
                <div className="surface padded muted">Поки що немає створених вами лотів.</div>
            ) : (
                <section className="lots-grid">
                    {hosted.map((lot) => (
                        <article key={lot.id} className="lot-card">
                            <h3>{lot.name}</h3>
                            <p className="muted" style={{ margin: 0 }}>
                                Статус: {lotStatusLabel(lot.status)}
                            </p>
                            <p className="muted" style={{ margin: 0 }}>
                                Початок: {parseUtcApiDate(lot.startTime).toLocaleString('uk-UA')}
                            </p>
                            <p className="muted" style={{ margin: 0 }}>
                                Стартова ціна: {lot.startPrice.toFixed(2)} грн
                            </p>
                            <Link className="btn btn-accent" to={`/lot/${lot.id}`}>Перейти до лота</Link>
                        </article>
                    ))}
                </section>
            )}
        </>
    );
};

export default MyAuctionHistoryView;
