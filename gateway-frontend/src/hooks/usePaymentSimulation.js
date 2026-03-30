import { useState } from 'react';
import { config } from '../config';

export const usePaymentSimulation = (paymentId) => {
    const [paymentStatus, setPaymentStatus] = useState('idle'); // idle, scanning, processing, success
    const [scanProgress, setScanProgress] = useState(0);

    const simulatePayment = () => {
        setPaymentStatus('scanning');
        let progress = 0;
        const interval = setInterval(() => {
            progress += 2;
            setScanProgress(progress);
            if (progress >= 100) {
                clearInterval(interval);
                setPaymentStatus('processing');

                // Call backend API
                processPayment();
            }
        }, 20);
    };

    const processPayment = async () => {
        try {
            const response = await fetch(`${config.backendUrl}/api/payments/${paymentId}/pay`, {
                method: 'POST',
            });
            const data = await response.json();

            if (data.success) {
                setPaymentStatus('success');
            } else {
                setPaymentStatus('idle'); // Handle error
                alert('Payment failed');
            }
        } catch (error) {
            console.error('Error processing payment:', error);
            setPaymentStatus('idle');
        }
    };

    const resetPayment = () => {
        setPaymentStatus('idle');
        setScanProgress(0);
    };

    return {
        paymentStatus,
        scanProgress,
        simulatePayment,
        resetPayment
    };
};
