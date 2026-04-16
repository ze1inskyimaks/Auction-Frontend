import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAuctionLot } from '../services/auction-api';
import { toDateTimeLocalValue } from '../services/date-time';
import { getApiErrorMessage } from '../services/error-message';
import { isAuthenticated, isUser } from '../services/identity-api';

const LotCreateView: React.FC = () => {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [startPrice, setStartPrice] = useState(0);
    const [startTime, setStartTime] = useState(toDateTimeLocalValue(new Date()));
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const canCreateLot = isAuthenticated() && isUser();

    const submit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!canCreateLot) {
            setError('Створення лотів доступне лише для ролі USER.');
            return;
        }
        try {
            setLoading(true);
            setError('');
            const lotId = await createAuctionLot({ name, description, startPrice, startTime, file });
            navigate(`/lot/${lotId}`);
        } catch (err) {
            setError(getApiErrorMessage(err, 'Не вдалося створити лот.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="form-wrap surface padded">
            <h1 className="page-title">Створення лота</h1>
            <p className="muted">Заповни базові дані, а фото можна додати відразу.</p>

            {error && <div className="error-box">{error}</div>}
            {!canCreateLot && <div className="error-box">Створення лотів недоступне для ролі ADMIN.</div>}

            <form onSubmit={submit}>
                <div className="field">
                    <label className="label">Назва</label>
                    <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="field">
                    <label className="label">Опис</label>
                    <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="field">
                    <label className="label">Стартова ціна</label>
                    <input className="input" type="number" min={0} step={0.01} value={startPrice} onChange={(e) => setStartPrice(Number(e.target.value))} required />
                </div>
                <div className="field">
                    <label className="label">Початок торгів</label>
                    <input className="input" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                </div>
                <div className="field">
                    <label className="label">Фото</label>
                    <input className="input" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </div>

                <div className="inline-row">
                    <button className="btn btn-ghost" type="button" onClick={() => navigate('/')}>Скасувати</button>
                    <button className="btn btn-primary" disabled={loading || !canCreateLot} type="submit">
                        {loading ? 'Створення...' : 'Створити'}
                    </button>
                </div>
            </form>
        </section>
    );
};

export default LotCreateView;
