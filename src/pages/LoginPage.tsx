import { useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";

interface LoginPageProps {
    onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [error, setError] = useState<string>("");
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        try {
            const response = await axios.post("http://localhost:5041/api/v1/identity/login", {
                email,
                password,
            });

            // 🔹 Логування для перевірки токену
            console.log("Отриманий токен:", response.data.token);

            // 🔹 Зберігаємо токен в Cookies
            Cookies.set("boby", response.data.token, { expires: 0.5 }); // Токен зберігається на 12 годин

            // 🔹 Колбек, щоб оновити стан в App.tsx
            onLogin();

            // 🔹 Редирект на Home
            navigate("/");
        } catch (err: any) {
            console.error(err);
            setError("Помилка входу. Перевірте логін та пароль.");
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

                <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600">
                    Увійти
                </button>
            </form>
        </div>
    );
};

export default LoginPage;
