import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAuctionLot } from '../services/auction-api';
import { toDateTimeLocalValue } from '../services/date-time';

const CreateLotPage: React.FC = () => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [startPrice, setStartPrice] = useState<number>(0);
    const [startTime, setStartTime] = useState<string>(toDateTimeLocalValue(new Date()));
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const handleCreateLot = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const newLotId = await createAuctionLot({
                name,
                description,
                startPrice,
                startTime,
                file,
            });

            navigate(`/lot/${newLotId}`);
        } catch (err: any) {
            if (err?.response?.status === 401) {
                setError('Ви не авторизовані! Увійдіть в систему.');
            } else {
                setError('Помилка створення лота. Спробуйте ще раз.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <form onSubmit={handleCreateLot} className="bg-white p-6 rounded-lg shadow-md w-96">
                <h2 className="text-2xl mb-4">Створення лота</h2>

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

                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full p-2 mb-3 border rounded-md"
                />

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
                >
                    {loading ? 'Створюю...' : 'Створити лот'}
                </button>
            </form>
        </div>
    );
};

export default CreateLotPage;
