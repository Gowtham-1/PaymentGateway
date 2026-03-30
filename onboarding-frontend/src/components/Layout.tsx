import React from 'react';
import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';

const Layout: React.FC = () => {
    return (
        <div className="app-layout">
            <Navigation />
            <div className="main-content">
                <Outlet />
            </div>
        </div>
    );
};

export default Layout;
