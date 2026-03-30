export interface Payment {
    id: string;
    amount: string;
    currency: string;
    description: string;
    status: 'pending' | 'completed' | 'failed';
    customer: string;
    date: string;
}

export interface CreatePaymentRequest {
    amount: string;
    currency?: string;
    description?: string;
    expiryHours?: string;
    customerEmail?: string;
}
