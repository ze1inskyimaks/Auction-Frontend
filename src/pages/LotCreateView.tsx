import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAuctionLot } from '../services/auction-api';
import { Category, createCategoryRequest, getCategories } from '../services/categories-api';
import { toDateTimeLocalValue } from '../services/date-time';
import { getApiErrorMessage } from '../services/error-message';
import { isAuthenticated, isUser } from '../services/identity-api';

const LotCreateView: React.FC = () => {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [startPrice, setStartPrice] = useState(0);
    const [startTime, setStartTime] = useState(toDateTimeLocalValue(new Date()));
    const [file, setFile] = useState<File | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryDescription, setNewCategoryDescription] = useState('');
    const [showRequestCategory, setShowRequestCategory] = useState(false);
    const [requestSuccess, setRequestSuccess] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [requestLoading, setRequestLoading] = useState(false);
    const canCreateLot = isAuthenticated() && isUser();

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const data = await getCategories();
                setCategories(data);
                if (data.length > 0) {
                    setCategoryId(data[0].id);
                }
            } catch (err) {
                setError(getApiErrorMessage(err, 'Не вдалося завантажити категорії.'));
            }
        };

        void loadCategories();
    }, []);

    const submit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!canCreateLot) {
            setError('Створення лотів доступне лише для ролі USER.');
            return;
        }
        if (!categoryId) {
            setError('Оберіть категорію для лота.');
            return;
        }

        try {
            setLoading(true);
            setError('');
            const lotId = await createAuctionLot({ name, description, categoryId, startPrice, startTime, file });
            navigate(`/lot/${lotId}`);
        } catch (err) {
            setError(getApiErrorMessage(err, 'Не вдалося створити лот.'));
        } finally {
            setLoading(false);
        }
    };

    const submitCategoryRequest = async () => {
        if (!isUser()) {
            setError('Запит на нову категорію доступний лише для USER.');
            return;
        }
        if (!newCategoryName.trim()) {
            setError('Вкажіть назву нової категорії.');
            return;
        }

        try {
            setRequestLoading(true);
            setError('');
            setRequestSuccess('');
            await createCategoryRequest({
                name: newCategoryName.trim(),
                description: newCategoryDescription.trim() || undefined,
            });
            setRequestSuccess('Запит на нову категорію надіслано. Після перевірки адміном вона зʼявиться у списку.');
            setNewCategoryName('');
            setNewCategoryDescription('');
            setShowRequestCategory(false);
        } catch (err) {
            setError(getApiErrorMessage(err, 'Не вдалося надіслати запит на категорію.'));
        } finally {
            setRequestLoading(false);
        }
    };

    return (
        <section className="form-wrap surface padded">
            <h1 className="page-title">Створення лота</h1>
            <p className="muted">Додайте основні дані лота, категорію і фото.</p>

            {error && <div className="error-box">{error}</div>}
            {requestSuccess && <div className="success-box">{requestSuccess}</div>}
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
                    <label className="label">Категорія</label>
                    <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
                        {categories.length === 0 && <option value="">Немає доступних категорій</option>}
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                    <div style={{ marginTop: '0.4rem' }}>
                        <button
                            className="btn btn-link"
                            type="button"
                            onClick={() => setShowRequestCategory((prev) => !prev)}
                        >
                            {showRequestCategory ? 'Скасувати запит категорії' : 'Немає потрібної категорії? Запропонувати нову'}
                        </button>
                    </div>
                </div>

                {showRequestCategory && (
                    <div className="surface padded" style={{ marginBottom: '0.75rem' }}>
                        <div>
                            <div className="field">
                                <label className="label">Назва нової категорії</label>
                                <input
                                    className="input"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="field">
                                <label className="label">Опис категорії (опціонально)</label>
                                <textarea
                                    className="textarea"
                                    value={newCategoryDescription}
                                    onChange={(e) => setNewCategoryDescription(e.target.value)}
                                />
                            </div>
                            <button className="btn btn-ghost" type="button" onClick={() => void submitCategoryRequest()} disabled={requestLoading}>
                                {requestLoading ? 'Надсилання...' : 'Надіслати запит'}
                            </button>
                        </div>
                    </div>
                )}

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
