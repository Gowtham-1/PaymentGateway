import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { config } from '../config';

interface PaymentNotification {
    id: string;
    amount: string | number;
    currency: string;
    description?: string;
}

interface PaymentNotificationWidgetProps {
    userEmail: string | null;
    gatewayUrl?: string;
}

/**
 * PaymentNotificationWidget
 * 
 * Drop this component into your Onboarding Application.
 */
const PaymentNotificationWidget: React.FC<PaymentNotificationWidgetProps> = ({ userEmail, gatewayUrl = config.gatewayUrl }) => {
    const [notification, setNotification] = useState<PaymentNotification | null>(null);

    useEffect(() => {
        if (!userEmail) return;

        // Connect to the Payment Gateway
        const socket = io(gatewayUrl);

        socket.on('connect', () => {
            console.log('[PaymentWidget] Connected to gateway');
            // Register the user to receive targeted notifications
            socket.emit('register-user', userEmail);
        });

        socket.on('payment-created', (data: PaymentNotification) => {
            console.log('[PaymentWidget] Payment received:', data);
            setNotification(data);

            // Optional: Trigger system notification if supported
            if (Notification.permission === 'granted') {
                new Notification('Payment Request', {
                    body: `Request for ${data.amount} ${data.currency}`,
                });
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [userEmail, gatewayUrl]);

    if (!notification) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: '#ffffff',
            color: '#1e293b',
            padding: '24px',
            borderRadius: '16px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            zIndex: 9999,
            maxWidth: '320px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            border: '1px solid #e2e8f0'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#4f46e5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                }}>
                    $
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Payment Request</h3>
                    <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>{userEmail}</p>
                </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>
                    {notification.amount} <span style={{ fontSize: '16px', fontWeight: 'normal', color: '#64748b' }}>{notification.currency}</span>
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b' }}>
                    {notification.description || 'No description provided'}
                </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
                <button
                    onClick={() => setNotification(null)}
                    style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        fontWeight: '500',
                        color: '#64748b'
                    }}
                >
                    Dismiss
                </button>
                <a
                    href={`${config.gatewayUrl}/pay/${notification.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setNotification(null)}
                    style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        backgroundColor: '#4f46e5',
                        color: 'white',
                        textDecoration: 'none',
                        textAlign: 'center',
                        fontWeight: '500',
                        display: 'block',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    Pay Now
                </a>
            </div>
        </div>
    );
};

export default PaymentNotificationWidget;
