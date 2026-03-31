export interface SignatureData {
    tokenAddress: string;
    merchantAddress: string;
    amountInWei: string;
    signature: string;
}

export interface Payment {
    id: string;
    amount: string;
    currency: string;
    description: string;
    status: 'pending' | 'completed' | 'failed';
    customer: string;
    date: string;
    signatureData?: SignatureData;
}

export interface CreatePaymentRequest {
    amount: string;
    currency?: string;
    description?: string;
    expiryHours?: string;
    customerEmail?: string;
}
