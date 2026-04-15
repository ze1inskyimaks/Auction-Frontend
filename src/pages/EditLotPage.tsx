import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAuctionLot, updateAuctionLot } from '../services/auction-api';
import { parseApiDate, toDateTimeLocalValue } from '../services/date-time';

const EditLotPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [startPrice, setStartPrice] = useState<number>(0);
    const [startTime, setStartTime] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [error, setError] = useState('');

    // Завантажуємо поточні дані лота
    useEffect(() => {
        if (!id) return;

        const fetchLot = async () => {
            try {
                const lot = await getAuctionLot(id);
                setName(lot.name);
                setDescription(lot.description ?? '');
                setStartPrice(lot.startPrice);
                // Форматуємо для datetime-local input
                setStartTime(toDateTimeLocalValue(parseApiDate(lot.startTime)));
            } catch {
                setError('Не вдалося завантажити лот.');
            } finally {
                setFetchLoading(false);
            }
        };

        fetchLot();
    }, [id]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!id) return;

        setError('');
        setLoading(true);

        try {
            await updateAuctionLot(id, { name, description, startPrice, startTime });
            navigate(`/lot/${id}`);
        } catch (err: any) {
            if (err?.response?.status === 401) {
                setError('Немає доступу. Тільки власник може редагувати.');
            } else {
                setError('Помилка при збереженні змін.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (fetchLoading) return <div className="p-4 text-gray-500">Завантаження...</div>;

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md w-96">
                <h2 className="text-2xl mb-4">Редагування лота</h2>

                {error && <div className="text-red-500 mb-2">{error}</div>}

                <input
                    type="text"
                    placeholder="Назва лота"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2 mb-3 border rounded-md"
                    required
                />

                <textarea
                    placeholder="Опис лота"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2 mb-3 border rounded-md"
                    rows={4}
                />

                <input
                    type="number"
                    placeholder="Початкова ціна"
                    value={startPrice}
                    onChange={(e) => setStartPrice(parseFloat(e.target.value))}
                    className="w-full p-2 mb-3 border rounded-md"
                    min={0}
                    step={0.01}
                    required
                />

                <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full p-2 mb-3 border rounded-md"
                    required
                />

                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => navigate(`/lot/${id}`)}
                        className="flex-1 bg-gray-200 text-gray-700 p-2 rounded-md hover:bg-gray-300"
                    >
                        Скасувати
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-yellow-400 text-white p-2 rounded-md hover:bg-yellow-500 disabled:opacity-50"
                    >
                        {loading ? 'Зберігаю...' : 'Зберегти'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditLotPage;
