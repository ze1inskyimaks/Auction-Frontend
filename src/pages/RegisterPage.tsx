import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register, login } from '../services/identity-api';

interface RegisterPageProps {
    onLogin: () => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [userName, setUserName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Паролі не співпадають!');
            return;
        }

        setLoading(true);

        try {
            await register({ userName, email, password });
            // Одразу логінимо після реєстрації
            await login({ email, password });
            onLogin();
            navigate('/');
        } catch (err: any) {
            const msg = err?.response?.data?.message ?? '';
            setError(`Помилка реєстрації. ${msg}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <form onSubmit={handleRegister} className="bg-white p-6 rounded-lg shadow-md w-80">
                <h2 className="text-2xl mb-4">Реєстрація</h2>

                {error && <div className="text-red-500 mb-2">{error}</div>}

                <input
                    type="text"
                    placeholder="Введіть ім'я користувача"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full p-2 mb-3 border rounded-md"
                    required
                />

                <input
                    type="email"
                    placeholder="Введіть email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2 mb-3 border rounded-md"
                    required
                />

                <input
                    type="password"
                    placeholder="Введіть пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2 mb-3 border rounded-md"
                    required
                />

                <input
                    type="password"
                    placeholder="Підтвердіть пароль"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-2 mb-3 border rounded-md"
                    required
                />

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-green-500 text-white p-2 rounded-md hover:bg-green-600 disabled:opacity-50"
                >
                    {loading ? 'Реєструюся...' : 'Зареєструватися'}
                </button>
            </form>
        </div>
    );
};

export default RegisterPage;
