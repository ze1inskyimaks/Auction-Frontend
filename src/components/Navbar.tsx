import React from 'react';
import { Link } from 'react-router-dom';

const Navbar: React.FC<{ isAuthenticated: boolean, onLogout: () => void }> = ({ isAuthenticated, onLogout }) => {
    return (
        <nav>
            <ul>
                <li><Link to="/">Home</Link></li>
                {isAuthenticated ? (
                    <>
                        <li><Link to="/profile">Profile</Link></li>
                        <li><Link to="/create-lot">Create lot</Link></li>
                        <li><button onClick={onLogout}>Logout</button></li>
                    </>
                ) : (
                    <>
                        <li><Link to="/login">Login</Link></li>
                        <li><Link to="/register">Register</Link></li>
                    </>
                )}
            </ul>
        </nav>
    );
};

export default Navbar;
