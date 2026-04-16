import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAuctionLot, updateAuctionLot } from '../services/auction-api';
import { parseApiDate, toDateTimeLocalValue } from '../services/date-time';
import { getApiErrorMessage } from '../services/error-message';

const LotEditView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [startPrice, setStartPrice] = useState(0);
    const [startTime, setStartTime] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!id) return;

        const load = async () => {
            try {
                const lot = await getAuctionLot(id);
                setName(lot.name);
                setDescription(lot.description || '');
                setStartPrice(lot.startPrice);
                setStartTime(toDateTimeLocalValue(parseApiDate(lot.startTime)));
            } catch (err) {
                setError(getApiErrorMessage(err, 'Не вдалося завантажити лот для редагування.'));
            }
        };

        load();
    }, [id]);

    const submit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!id) return;

        try {
            setLoading(true);
            setError('');
            await updateAuctionLot(id, { name, description, startPrice, startTime });
            navigate(`/lot/${id}`);
        } catch (err) {
            setError(getApiErrorMessage(err, 'Не вдалося оновити лот.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="form-wrap surface padded">
            <h1 className="page-title">Редагування лота</h1>
            {error && <div className="error-box">{error}</div>}

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

                <div className="inline-row">
                    <button className="btn btn-ghost" type="button" onClick={() => navigate(`/lot/${id}`)}>Скасувати</button>
                    <button className="btn btn-primary" disabled={loading} type="submit">
                        {loading ? 'Збереження...' : 'Зберегти'}
                    </button>
                </div>
            </form>
        </section>
    );
};

export default LotEditView;
