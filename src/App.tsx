import React, { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import { isAuthenticated, logout } from './services/identity-api';
import HomeView from './pages/HomeView';
import LotView from './pages/LotView';
import LotCreateView from './pages/LotCreateView';
import LotEditView from './pages/LotEditView';
import LoginView from './pages/LoginView';
import RegisterView from './pages/RegisterView';
import AuctionHistoryView from './pages/AuctionHistoryView';
import MyAuctionHistoryView from './pages/MyAuctionHistoryView';

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
            <div className="app-shell">
                <Navbar isAuthenticated={authenticated} onLogout={handleLogout} />
                <main className="app-main">
                    <Routes>
                        <Route path="/" element={<HomeView />} />
                        <Route path="/lot/:id" element={<LotView />} />
                        <Route path="/lot/:id/edit" element={<LotEditView />} />
                        <Route path="/history" element={<AuctionHistoryView />} />
                        <Route path="/login" element={<LoginView onLogin={handleLogin} />} />
                        <Route path="/register" element={<RegisterView onLogin={handleLogin} />} />
                        <Route path="/create-lot" element={<LotCreateView />} />
                        <Route path="/my-history" element={<MyAuctionHistoryView />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    );
}

export default App;
