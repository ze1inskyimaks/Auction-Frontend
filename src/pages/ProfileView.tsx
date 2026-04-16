import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../services/error-message';
import { getMyProfile, isAuthenticated, updateMyProfile } from '../services/identity-api';

const ProfileView: React.FC = () => {
    const navigate = useNavigate();
    const [userName, setUserName] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [roles, setRoles] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }

        const loadProfile = async () => {
            try {
                setLoading(true);
                const profile = await getMyProfile();
                setUserName(profile.userName ?? '');
                setEmail(profile.email ?? '');
                setPhoneNumber(profile.phoneNumber ?? '');
                setRoles(profile.roles ?? []);
            } catch (err) {
                setError(getApiErrorMessage(err, 'Не вдалося завантажити профіль.'));
            } finally {
                setLoading(false);
            }
        };

        void loadProfile();
    }, [navigate]);

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            setSaving(true);
            setError('');
            setSuccess('');

            const updated = await updateMyProfile({
                userName: userName.trim(),
                email: email.trim(),
                phoneNumber: phoneNumber.trim() || null,
            });

            setUserName(updated.userName ?? '');
            setEmail(updated.email ?? '');
            setPhoneNumber(updated.phoneNumber ?? '');
            setRoles(updated.roles ?? []);
            setSuccess('Профіль успішно оновлено.');
        } catch (err) {
            setError(getApiErrorMessage(err, 'Не вдалося оновити профіль.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="form-wrap surface padded">
            <h1 className="page-title">Мій профіль</h1>
            <p className="muted">Оновлюйте контактні дані, щоб адміністрація могла швидко зв’язатися з вами.</p>

            {loading && <p className="muted">Завантаження профілю...</p>}
            {error && <div className="error-box">{error}</div>}
            {success && <div className="success-box">{success}</div>}

            {!loading && (
                <form onSubmit={onSubmit}>
                    <div className="field">
                        <label className="label">Імʼя користувача</label>
                        <input className="input" value={userName} onChange={(e) => setUserName(e.target.value)} required />
                    </div>

                    <div className="field">
                        <label className="label">Email</label>
                        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>

                    <div className="field">
                        <label className="label">Телефон</label>
                        <input className="input" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+380..." />
                    </div>

                    <div className="field">
                        <label className="label">Ролі</label>
                        <div className="muted">{roles.length > 0 ? roles.join(', ') : 'Немає ролей'}</div>
                    </div>

                    <div className="inline-row">
                        <button className="btn btn-ghost" type="button" onClick={() => navigate('/')}>Скасувати</button>
                        <button className="btn btn-primary" type="submit" disabled={saving}>
                            {saving ? 'Збереження...' : 'Зберегти'}
                        </button>
                    </div>
                </form>
            )}
        </section>
    );
};

export default ProfileView;
