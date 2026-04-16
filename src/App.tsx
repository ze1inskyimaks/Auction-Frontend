import React, { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import { isAdmin, isAuthenticated, isUser, logout } from './services/identity-api';
import HomeView from './pages/HomeView';
import LotView from './pages/LotView';
import LotCreateView from './pages/LotCreateView';
import LotEditView from './pages/LotEditView';
import LoginView from './pages/LoginView';
import RegisterView from './pages/RegisterView';
import AuctionHistoryView from './pages/AuctionHistoryView';
import MyAuctionHistoryView from './pages/MyAuctionHistoryView';
import AdminCategoryRequestsView from './pages/AdminCategoryRequestsView';
import ProfileView from './pages/ProfileView';

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

    const userOnly = (element: React.ReactElement): React.ReactElement => {
        if (!authenticated) {
            return <Navigate to="/login" replace />;
        }
        if (!isUser()) {
            return <Navigate to="/" replace />;
        }
        return element;
    };

    const adminOnly = (element: React.ReactElement): React.ReactElement => {
        if (!authenticated) {
            return <Navigate to="/login" replace />;
        }
        if (!isAdmin()) {
            return <Navigate to="/" replace />;
        }
        return element;
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
                        <Route path="/create-lot" element={userOnly(<LotCreateView />)} />
                        <Route path="/my-history" element={userOnly(<MyAuctionHistoryView />)} />
                        <Route path="/profile" element={authenticated ? <ProfileView /> : <Navigate to="/login" replace />} />
                        <Route path="/admin/category-requests" element={adminOnly(<AdminCategoryRequestsView />)} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    );
}

export default App;
