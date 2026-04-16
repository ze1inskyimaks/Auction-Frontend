import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../services/identity-api';
import { getApiErrorMessage } from '../services/error-message';

interface RegisterViewProps {
    onLogin: () => void;
}

const RegisterView: React.FC<RegisterViewProps> = ({ onLogin }) => {
    const navigate = useNavigate();
    const [userName, setUserName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError('Паролі не співпадають.');
            return;
        }

        try {
            setLoading(true);
            setError('');
            await register({ userName, email, password });
            await login({ email, password });
            onLogin();
            navigate('/');
        } catch (err) {
            setError(getApiErrorMessage(err, 'Помилка реєстрації.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="form-wrap surface padded">
            <h1 className="page-title">Реєстрація</h1>
            <p className="muted">Створи акаунт, щоб виставляти лоти і робити ставки.</p>
            {error && <div className="error-box">{error}</div>}

            <form onSubmit={submit}>
                <div className="field">
                    <label className="label">Нікнейм</label>
                    <input className="input" value={userName} onChange={(e) => setUserName(e.target.value)} required />
                </div>
                <div className="field">
                    <label className="label">Email</label>
                    <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="field">
                    <label className="label">Пароль</label>
                    <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <div className="field">
                    <label className="label">Повтор пароля</label>
                    <input className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                </div>

                <button className="btn btn-primary" disabled={loading} type="submit">
                    {loading ? 'Реєстрація...' : 'Зареєструватися'}
                </button>
            </form>
        </section>
    );
};

export default RegisterView;
