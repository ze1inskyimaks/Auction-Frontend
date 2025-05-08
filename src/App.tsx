import React, { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LotPage from "./pages/LotPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import Navbar from "./components/Navbar";
import Cookies from 'js-cookie';
import RegisterPage from "./pages/RegisterPage";
import CreateLotPage from "./pages/CreateLotPage";

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // 🔹 Перевірка токена з Cookies
    useEffect(() => {
        const token = Cookies.get('boby');
        console.log("Токен з Cookies:", token); // Додатковий лог для перевірки
        setIsAuthenticated(!!token);
    }, []);

    // 🔹 Обробка виходу
    const handleLogout = () => {
        Cookies.remove('boby'); // Видаляємо токен з кукі
        setIsAuthenticated(false); // Оновлюємо стан автентифікації
    };

    return (
        <BrowserRouter>
            <Navbar isAuthenticated={isAuthenticated} onLogout={handleLogout} />
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/lot/:id" element={<LotPage />} />
                <Route path="/login" element={<LoginPage onLogin={() => setIsAuthenticated(true)} />} />
                <Route path="/register" element={<RegisterPage onLogin={() => setIsAuthenticated(true)} />} />
                <Route path="/create-lot" element={<CreateLotPage />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
