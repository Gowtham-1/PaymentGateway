import { Payment, CreatePaymentRequest } from '../types';

// In-memory database
const payments: Payment[] = [
    { id: 'PAY-001', amount: '250', currency: 'USDC', description: 'Initial Test Payment', status: 'completed', customer: '0x742d...9c8f', date: '2025-11-30 14:23' },
    { id: 'PAY-002', amount: '89.50', currency: 'USDC', description: 'Service Fee', status: 'pending', customer: '0x8b3a...2d1e', date: '2025-11-30 13:15' }
];

export const PaymentModel = {
    findAll: (): Payment[] => {
        return payments;
    },

    findById: (id: string): Payment | undefined => {
        return payments.find(p => p.id === id);
    },

    create: (data: CreatePaymentRequest): Payment => {
        const newPayment: Payment = {
            id: `PAY-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            amount: data.amount,
            currency: data.currency || 'USDC',
            description: data.description || '',
            status: 'pending',
            date: new Date().toLocaleString(),
            customer: '-' // No customer yet
        };
        payments.unshift(newPayment);
        return newPayment;
    },

    updateStatus: (id: string, status: 'pending' | 'completed' | 'failed', customer?: string): Payment | undefined => {
        const payment = payments.find(p => p.id === id);
        if (payment) {
            payment.status = status;
            if (customer) {
                payment.customer = customer;
            }
        }
        return payment;
    }
};
