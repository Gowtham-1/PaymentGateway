import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { config } from '../config';

const Navigation: React.FC = () => {
    // Removed unused navigate

    const handleLogout = () => {
        window.location.href = `${config.backendUrl}/auth/logout`;
    };

    return (
        <nav className="glass-nav">
            <div className="nav-brand">
                <span className="logo-icon">⚡</span>
                <span className="logo-text">FlashWallet</span>
            </div>
            <div className="nav-links">
                <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                    Dashboard
                </NavLink>
                <NavLink to="/send" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                    Send
                </NavLink>
            </div>
            <button className="btn-logout-nav" onClick={handleLogout}>
                Logout
            </button>
        </nav>
    );
};

export default Navigation;
