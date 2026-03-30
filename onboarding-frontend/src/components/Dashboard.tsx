import React, { useEffect, useState } from 'react';
import Wallet from './Wallet';

interface User {
    googleId: string;
    name: string;
    email: string;
    avatar: string;
}

const Dashboard: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getUserProfile = () => {
            fetch("/api/onboarding/user/profile", {
                method: "GET",
                credentials: "include",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Credentials": "true"
                },
            })
                .then((res) => {
                    if (res.status === 200) {
                        return res.json();
                    }
                    throw new Error("Failed to fetch user profile");
                })
                .then((res) => {
                    setUser(res.user);
                    if (res.user.walletAddress) {
                        setWalletAddress(res.user.walletAddress);
                    }
                })
                .catch((err) => {
                    console.log(err);
                })
                .finally(() => {
                    setLoading(false);
                });
        };
        getUserProfile();
    }, []);

    if (loading) {
        return <div className="dashboard-card fade-in" style={{ padding: '4rem', textAlign: 'center' }}>Loading your profile...</div>;
    }

    return (
        <div className="dashboard-card fade-in">
            <div className="dashboard-header">
                <div className="user-profile">
                    <div className="avatar-circle">
                        <h1>{"Hi!"}</h1>
                    </div>
                    <div className="user-info">
                        <h1>{user?.name}</h1>
                    </div>
                </div>
            </div>

            <div className="dashboard-content">
                <Wallet walletAddress={walletAddress} />
            </div>
        </div>
    );
};

export default Dashboard;
