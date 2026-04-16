import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CategoryRequest,
    approveCategoryRequest,
    createCategory,
    getCategoryRequests,
    rejectCategoryRequest,
} from '../services/categories-api';
import { parseUtcApiDate } from '../services/date-time';
import { getApiErrorMessage } from '../services/error-message';
import { isAdmin, isAuthenticated } from '../services/identity-api';

const AdminCategoryRequestsView: React.FC = () => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState<CategoryRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [commentById, setCommentById] = useState<Record<string, string>>({});
    const [createName, setCreateName] = useState('');
    const [createDescription, setCreateDescription] = useState('');
    const [createLoading, setCreateLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [showProcessed, setShowProcessed] = useState(false);
    const canAccess = isAuthenticated() && isAdmin();

    const loadRequests = async () => {
        try {
            setLoading(true);
            const data = await getCategoryRequests();
            setRequests(data);
        } catch (err) {
            setError(getApiErrorMessage(err, 'Не вдалося завантажити запити категорій.'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!canAccess) {
            return;
        }
        void loadRequests();
    }, [canAccess]);

    const visibleRequests = useMemo(() => {
        if (showProcessed) {
            return requests;
        }

        return requests.filter((request) => String(request.status).toLowerCase() === 'pending');
    }, [requests, showProcessed]);

    const onApprove = async (id: string) => {
        try {
            setError('');
            setSuccess('');
            await approveCategoryRequest(id, { adminComment: commentById[id] || undefined });
            setSuccess('Запит успішно погоджено.');
            await loadRequests();
        } catch (err) {
            setError(getApiErrorMessage(err, 'Не вдалося погодити запит.'));
        }
    };

    const onReject = async (id: string) => {
        try {
            setError('');
            setSuccess('');
            await rejectCategoryRequest(id, { adminComment: commentById[id] || undefined });
            setSuccess('Запит відхилено.');
            await loadRequests();
        } catch (err) {
            setError(getApiErrorMessage(err, 'Не вдалося відхилити запит.'));
        }
    };

    const onCreateCategory = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            setCreateLoading(true);
            setError('');
            setSuccess('');
            await createCategory({
                name: createName.trim(),
                description: createDescription.trim() || undefined,
            });
            setSuccess('Категорію створено.');
            setCreateName('');
            setCreateDescription('');
            await loadRequests();
        } catch (err) {
            setError(getApiErrorMessage(err, 'Не вдалося створити категорію.'));
        } finally {
            setCreateLoading(false);
        }
    };

    if (!canAccess) {
        return (
            <section className="surface padded">
                <div className="error-box">Сторінка доступна лише для ADMIN.</div>
                <button className="btn btn-ghost" onClick={() => navigate('/')}>На головну</button>
            </section>
        );
    }

    return (
        <>
            <section className="page-head">
                <div>
                    <h1 className="page-title">Запити на категорії</h1>
                    <p className="muted">Тут ви можете погоджувати або відхиляти пропозиції користувачів.</p>
                </div>
            </section>

            {error && <div className="error-box">{error}</div>}
            {success && <div className="success-box">{success}</div>}

            <section className="surface padded" style={{ marginBottom: '1rem' }}>
                <h3 style={{ marginTop: 0 }}>Швидке створення категорії</h3>
                <form onSubmit={onCreateCategory}>
                    <div className="field">
                        <label className="label">Назва</label>
                        <input className="input" value={createName} onChange={(e) => setCreateName(e.target.value)} required />
                    </div>
                    <div className="field">
                        <label className="label">Опис</label>
                        <textarea className="textarea" value={createDescription} onChange={(e) => setCreateDescription(e.target.value)} />
                    </div>
                    <button className="btn btn-primary" type="submit" disabled={createLoading}>
                        {createLoading ? 'Створення...' : 'Створити категорію'}
                    </button>
                </form>
            </section>

            <section className="surface padded">
                <div className="inline-row" style={{ justifyContent: 'space-between', marginBottom: '0.7rem' }}>
                    <h3 style={{ margin: 0 }}>Черга запитів</h3>
                    <label className="inline-row" style={{ gap: '0.35rem' }}>
                        <input
                            type="checkbox"
                            checked={showProcessed}
                            onChange={(e) => setShowProcessed(e.target.checked)}
                        />
                        <span className="muted">Показувати оброблені</span>
                    </label>
                </div>

                {loading && <p className="muted">Завантаження...</p>}
                {!loading && visibleRequests.length === 0 && (
                    <p className="muted">
                        {showProcessed ? 'Запитів поки немає.' : 'Немає активних запитів. Усі оброблені приховано.'}
                    </p>
                )}

                {!loading && visibleRequests.map((request) => {
                    const isPending = String(request.status).toLowerCase() === 'pending';
                    const reviewer = request.reviewedBy?.userName ?? request.reviewedBy?.email ?? '—';
                    const requester = request.requestedBy?.userName ?? request.requestedBy?.email ?? request.requestedBy?.requestedById ?? '—';

                    return (
                        <article key={request.id} className="request-card">
                            <div className="request-card-head">
                                <strong>{request.name}</strong>
                                <span className={`pill ${isPending ? '' : 'pill-muted'}`}>{request.status}</span>
                            </div>
                            {request.description && <p style={{ marginTop: '0.45rem' }}>{request.description}</p>}
                            <p className="muted" style={{ margin: '0.2rem 0' }}>Від: {requester}</p>
                            <p className="muted" style={{ margin: '0.2rem 0' }}>
                                Подано: {parseUtcApiDate(request.createdAt).toLocaleString('uk-UA')}
                            </p>
                            {request.reviewedAt && (
                                <p className="muted" style={{ margin: '0.2rem 0' }}>
                                    Перевірено: {parseUtcApiDate(request.reviewedAt).toLocaleString('uk-UA')} ({reviewer})
                                </p>
                            )}
                            {request.adminComment && (
                                <p className="muted" style={{ margin: '0.2rem 0' }}>
                                    Коментар адміна: {request.adminComment}
                                </p>
                            )}

                            {isPending && (
                                <>
                                    <div className="field" style={{ marginTop: '0.6rem' }}>
                                        <label className="label">Коментар (опціонально)</label>
                                        <textarea
                                            className="textarea"
                                            value={commentById[request.id] ?? ''}
                                            onChange={(e) => setCommentById((prev) => ({ ...prev, [request.id]: e.target.value }))}
                                        />
                                    </div>
                                    <div className="inline-row">
                                        <button className="btn btn-primary" onClick={() => void onApprove(request.id)}>Погодити</button>
                                        <button className="btn btn-danger" onClick={() => void onReject(request.id)}>Відхилити</button>
                                    </div>
                                </>
                            )}
                        </article>
                    );
                })}
            </section>
        </>
    );
};

export default AdminCategoryRequestsView;
