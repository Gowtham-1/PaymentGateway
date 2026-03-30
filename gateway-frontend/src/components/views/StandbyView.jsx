import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Loader2, Smartphone } from 'lucide-react';

const StandbyView = () => {
    const navigate = useNavigate();
    const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
    const [connectedEmail, setConnectedEmail] = useState('');

    useEffect(() => {
        // Request notification permission
        if (Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                setNotificationPermission(permission);
            });
        }

        // Connect to the backend Socket.io server
        const socket = io();

        socket.on('connect', () => {
            console.log('Connected to payment server');
            const email = localStorage.getItem('user_email');
            if (email) {
                setConnectedEmail(email);
                console.log('Registering user:', email);
                socket.emit('register-user', email);
            }
        });

        // Listen for payment creation events
        socket.on('payment-created', (data) => {
            console.log('New payment received:', data);

            // Send Browser Notification
            if (Notification.permission === 'granted') {
                const notification = new Notification('New Payment Request', {
                    body: `You have a new payment request for ${data.amount} ${data.currency || 'USDC'}`,
                    icon: '/vite.svg' // Optional: Add an icon if available
                });

                notification.onclick = () => {
                    window.focus();
                    navigate(`/pay/${data.id}`);
                };
            }

            if (data && data.id) {
                // Redirect to the payment page
                navigate(`/pay/${data.id}`);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [navigate]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-full max-w-md space-y-8">
                <div className="relative w-24 h-24 mx-auto">
                    <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping" />
                    <div className="relative bg-white dark:bg-slate-800 rounded-full p-6 shadow-xl ring-1 ring-slate-200 dark:ring-slate-700">
                        <Smartphone className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
                    </div>
                </div>

                <div className="space-y-4">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                        Waiting for Payment
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg">
                        {connectedEmail ? `Logged in as ${connectedEmail}` : 'Please wait while the merchant initiates the request...'}
                    </p>

                    {notificationPermission === 'granted' ? (
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                            <span className="w-2 h-2 bg-green-500 rounded-full" />
                            Notifications Enabled
                        </div>
                    ) : (
                        <button
                            onClick={() => Notification.requestPermission().then(setNotificationPermission)}
                            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium underline"
                        >
                            Enable Notifications
                        </button>
                    )}
                </div>

                <div className="flex items-center justify-center gap-3 text-sm text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connected to secure gateway</span>
                </div>
            </div>
        </div>
    );
};

export default StandbyView;
