import React, { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LotPage from './pages/LotPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import Navbar from './components/Navbar';
import RegisterPage from './pages/RegisterPage';
import CreateLotPage from './pages/CreateLotPage';
import EditLotPage from './pages/EditLotPage';
import { isAuthenticated, logout } from './services/identity-api';

function App() {
    const [authenticated, setAuthenticated] = useState(false);

    useEffect(() => {
        setAuthenticated(isAuthenticated());
    }, []);

    const handleLogin = () => setAuthenticated(true);

    const handleLogout = () => {
        logout();
        setAuthenticated(false);
    };

    return (
        <BrowserRouter>
            <Navbar isAuthenticated={authenticated} onLogout={handleLogout} />
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/lot/:id" element={<LotPage />} />
                <Route path="/lot/:id/edit" element={<EditLotPage />} />
                <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
                <Route path="/register" element={<RegisterPage onLogin={handleLogin} />} />
                <Route path="/create-lot" element={<CreateLotPage />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
