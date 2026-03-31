import { useState, useEffect } from 'react';

export const useMerchantForm = () => {
    const [formData, setFormData] = useState({
        amount: '',
        currency: 'ETH',
        description: '',
        customerEmail: ''
    });
    const [generatedLink, setGeneratedLink] = useState('');
    const [copied, setCopied] = useState(false);
    const [payments, setPayments] = useState([]);

    // Fetch payments on mount
    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        try {
            const response = await fetch('/api/gateway/payments');
            const data = await response.json();
            setPayments(data);
        } catch (error) {
            console.error('Error fetching payments:', error);
        }
    };

    const handleGenerate = async () => {
        if (!formData.amount) return;

        try {
            const response = await fetch('/api/gateway/payments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: formData.amount,
                    currency: formData.currency,
                    description: formData.description,
                    customerEmail: formData.customerEmail
                }),
            });

            const data = await response.json();
            if (data.success) {
                setGeneratedLink(data.link);
                fetchPayments(); // Refresh history
            }
        } catch (error) {
            console.error('Error creating payment:', error);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return {
        formData,
        generatedLink,
        copied,
        payments,
        handleGenerate,
        copyToClipboard,
        handleInputChange
    };
};
