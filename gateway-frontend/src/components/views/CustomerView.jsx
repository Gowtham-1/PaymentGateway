
import React, { useEffect, useState } from 'react';
import { Wallet, Fingerprint, Shield, ScanFace, Check } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { usePaymentSimulation } from '../../hooks/usePaymentSimulation';

const CustomerView = () => {
    const { id } = useParams();
    const {
        paymentStatus,
        scanProgress,
        simulatePayment,
        resetPayment
    } = usePaymentSimulation(id);

    const [paymentDetails, setPaymentDetails] = useState(null);

    useEffect(() => {
        const fetchPaymentDetails = async () => {
            try {
                const response = await fetch(`/api/gateway/payments/${id}`);
                const data = await response.json();
                setPaymentDetails(data);
            } catch (error) {
                console.error('Error fetching payment details:', error);
            }
        };

        fetchPaymentDetails();
    }, [id]);

    if (!paymentDetails) {
        return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-indigo-50/50 dark:from-indigo-900/20 to-transparent pointer-events-none" />

            <div className="w-full max-w-md relative z-10">
                {/* Merchant Info */}
                <div className="text-center mb-12">
                    <div className="w-16 h-16 mx-auto bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-600/30 mb-6">
                        <Wallet className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mb-2">Payment Request from</p>
                    <h1 className="text-2xl font-bold">Merchant Store Inc.</h1>
                </div>

                {/* Payment Card */}
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl shadow-slate-200/50 dark:shadow-none ring-1 ring-slate-200 dark:ring-slate-800 p-8 text-center relative overflow-hidden">

                    {paymentStatus === 'idle' && (
                        <div className="animate-in fade-in zoom-in duration-300">
                            <p className="text-slate-500 dark:text-slate-400 font-medium mb-2">Total Amount</p>
                            <div className="text-5xl font-bold tracking-tight mb-2">
                                {paymentDetails.amount} <span className="text-2xl text-slate-400">{paymentDetails.currency}</span>
                            </div>
                            <p className="text-sm text-slate-400 mb-8">{paymentDetails.description}</p>

                            <div className="space-y-4">
                                <button
                                    onClick={simulatePayment}
                                    className="w-full py-5 bg-black dark:bg-white text-white dark:text-black font-bold text-lg rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-xl"
                                >
                                    <Fingerprint className="w-6 h-6" />
                                    Pay with Passkey
                                </button>
                                <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
                                    <Shield className="w-3 h-3" />
                                    Secured by Smart Wallet
                                </p>
                            </div>
                        </div>
                    )}

                    {paymentStatus === 'scanning' && (
                        <div className="py-8 animate-in fade-in duration-300">
                            <div className="relative w-24 h-24 mx-auto mb-6">
                                <div className="absolute inset-0 border-4 border-slate-100 dark:border-slate-800 rounded-full" />
                                <div
                                    className="absolute inset-0 border-4 border-indigo-500 rounded-full transition-all duration-75"
                                    style={{ clipPath: `inset(0 0 ${100 - scanProgress}% 0)` }}
                                />
                                <ScanFace className="absolute inset-0 m-auto w-10 h-10 text-indigo-500 animate-pulse" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Verifying Passkey</h3>
                            <p className="text-slate-500">Scan your face or fingerprint</p>
                        </div>
                    )}

                    {paymentStatus === 'processing' && (
                        <div className="py-8 animate-in fade-in duration-300">
                            <div className="w-16 h-16 mx-auto mb-6 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Processing</h3>
                            <p className="text-slate-500">Confirming on blockchain...</p>
                        </div>
                    )}

                    {paymentStatus === 'success' && (
                        <div className="py-8 animate-in fade-in zoom-in duration-300">
                            <div className="w-20 h-20 mx-auto mb-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
                            </div>
                            <h3 className="text-2xl font-bold mb-2">Payment Successful</h3>
                            <p className="text-slate-500 mb-8">Transaction confirmed</p>
                            <button
                                onClick={resetPayment}
                                className="text-indigo-600 font-medium hover:underline"
                            >
                                Make another payment
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default CustomerView;
