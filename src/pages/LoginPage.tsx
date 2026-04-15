import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/identity-api';

interface LoginPageProps {
    onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login({ email, password });
            onLogin();
            navigate('/');
        } catch (err: any) {
            setError('Помилка входу. Перевірте логін та пароль.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <form onSubmit={handleLogin} className="bg-white p-6 rounded-lg shadow-md w-80">
                <h2 className="text-2xl mb-4">Вхід</h2>

                {error && <div className="text-red-500 mb-2">{error}</div>}

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

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
                >
                    {loading ? 'Входжу...' : 'Увійти'}
                </button>
            </form>
        </div>
    );
};

export default LoginPage;
