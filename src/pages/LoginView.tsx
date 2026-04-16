import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/identity-api';
import { getApiErrorMessage } from '../services/error-message';

interface LoginViewProps {
    onLogin: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            setLoading(true);
            setError('');
            await login({ email, password });
            onLogin();
            navigate('/');
        } catch (err) {
            setError(getApiErrorMessage(err, 'Помилка входу. Перевір email і пароль.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="form-wrap surface padded">
            <h1 className="page-title">Вхід в акаунт</h1>
            <p className="muted">Увійди, щоб створювати лоти і брати участь у торгах.</p>
            {error && <div className="error-box">{error}</div>}

            <form onSubmit={submit}>
                <div className="field">
                    <label className="label">Email</label>
                    <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="field">
                    <label className="label">Пароль</label>
                    <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>

                <div className="inline-row">
                    <button className="btn btn-primary" disabled={loading} type="submit">
                        {loading ? 'Вхід...' : 'Увійти'}
                    </button>
                </div>
            </form>
        </section>
    );
};

export default LoginView;
