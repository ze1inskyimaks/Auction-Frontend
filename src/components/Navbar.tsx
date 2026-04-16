import React from 'react';
import { Link } from 'react-router-dom';

const Navbar: React.FC<{ isAuthenticated: boolean, onLogout: () => void }> = ({ isAuthenticated, onLogout }) => {
    return (
        <nav className="topbar">
            <div className="topbar-inner">
                <Link to="/" className="brand">
                    AUCTION HALL
                    <small>live bidding platform</small>
                </Link>

                <div className="nav-links">
                    <Link to="/" className="nav-link">Головна</Link>
                    <Link to="/history" className="nav-link">Історія</Link>
                    {isAuthenticated ? (
                        <>
                            <Link to="/create-lot" className="nav-link">Створити лот</Link>
                            <Link to="/my-history" className="nav-link">Моя історія</Link>
                            <button className="btn btn-ghost" onClick={onLogout}>Вийти</button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="nav-link">Увійти</Link>
                            <Link to="/register" className="btn btn-primary">Реєстрація</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
