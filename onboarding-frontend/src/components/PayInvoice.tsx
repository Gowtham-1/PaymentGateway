import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createSmartAccountClient } from 'permissionless';
import { toSafeSmartAccount } from 'permissionless/accounts';
import { createPublicClient, http, encodeFunctionData } from 'viem';
import { hoodi } from '../network';
import { toWebAuthnAccount } from 'viem/account-abstraction';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { entryPoint07Address } from 'viem/account-abstraction';
import { config } from '../config';

const publicClient = createPublicClient({ transport: http('https://rpc.hoodi.ethpandaops.io'), chain: hoodi });
const pimlicoUrl = config.pimlicoUrl;

const GATEWAY_CONTRACT_ADDRESS = '0xF3464f9Add507619Fa49d52Fb035cD2D5EA2AB7E';

const gatewayAbi = [
    {
        "inputs": [
            { "internalType": "string", "name": "paymentId", "type": "string" },
            { "internalType": "address", "name": "token", "type": "address" },
            { "internalType": "address", "name": "merchant", "type": "address" },
            { "internalType": "uint256", "name": "amount", "type": "uint256" },
            { "internalType": "bytes", "name": "signature", "type": "bytes" }
        ],
        "name": "processERC20Payment",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "string", "name": "paymentId", "type": "string" },
            { "internalType": "address", "name": "merchant", "type": "address" },
            { "internalType": "bytes", "name": "signature", "type": "bytes" }
        ],
        "name": "processNativePayment",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    }
];

type PaymentStatus = 'loading' | 'idle' | 'scanning' | 'processing' | 'success' | 'error';

const PayInvoice: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [status, setStatus] = useState<PaymentStatus>('loading');
    const [errorMsg, setErrorMsg] = useState('');
    const [invoice, setInvoice] = useState<any>(null);
    const [txHash, setTxHash] = useState('');

    useEffect(() => {
        const loadInvoice = async () => {
            try {
                // Fetch from local Nginx proxy -> gateway-backend
                const response = await fetch(`/api/gateway/payments/${id}`);
                if (!response.ok) throw new Error('Invoice not found');
                const data = await response.json();
                setInvoice(data);
                setStatus('idle');
            } catch (err) {
                setErrorMsg('Failed to load invoice. Please check the payment link.');
                setStatus('error');
            }
        };
        if (id) loadInvoice();
    }, [id]);

    const payWithPasskey = async () => {
        if (!invoice || !invoice.signatureData) {
            setErrorMsg('Missing signature data!');
            setStatus('error');
            return;
        }

        setStatus('scanning');
        try {
            const res = await fetch('/api/onboarding/user/profile', { credentials: 'include' });
            if (!res.ok) throw new Error('Please log in to your wallet first.');
            const data = (await res.json()).user;

            let storedPublicKey = data.publicKey as `0x${string}`;
            if (storedPublicKey.length === 184) storedPublicKey = `0x${storedPublicKey.slice(54)}` as `0x${string}`;

            const webAuthnAccount = toWebAuthnAccount({ credential: { id: data.credentialId, publicKey: storedPublicKey } });
            const pimlicoClient = createPimlicoClient({ transport: http(pimlicoUrl), entryPoint: { address: entryPoint07Address, version: '0.7' } });

            const safeAccount = await toSafeSmartAccount({
                client: publicClient,
                owners: [webAuthnAccount as any],
                version: '1.4.1',
                entryPoint: { address: entryPoint07Address, version: '0.7' },
                address: data.walletAddress as `0x${string}`,
            });

            const smartClient = createSmartAccountClient({
                account: safeAccount, chain: hoodi, bundlerTransport: http(pimlicoUrl), paymaster: pimlicoClient,
                userOperation: { estimateFeesPerGas: async () => (await pimlicoClient.getUserOperationGasPrice()).fast }
            });

            setStatus('processing');
            const sigData = invoice.signatureData;

            let hash;
            if (sigData.tokenAddress === '0x0000000000000000000000000000000000000000') {
                const callData = encodeFunctionData({
                    abi: gatewayAbi,
                    functionName: 'processNativePayment',
                    args: [invoice.id, sigData.merchantAddress, sigData.signature]
                });
                hash = await smartClient.sendTransaction({
                    to: GATEWAY_CONTRACT_ADDRESS,
                    value: BigInt(sigData.amountInWei),
                    data: callData,
                });
            } else {
                const callData = encodeFunctionData({
                    abi: gatewayAbi,
                    functionName: 'processERC20Payment',
                    args: [invoice.id, sigData.tokenAddress, sigData.merchantAddress, BigInt(sigData.amountInWei), sigData.signature]
                });
                hash = await smartClient.sendTransaction({
                    to: GATEWAY_CONTRACT_ADDRESS,
                    value: BigInt(0),
                    data: callData,
                });
            }

            setTxHash(hash);
            setStatus('success');
        } catch (err: any) {
            console.error(err);
            setErrorMsg(err.message || 'Transaction failed');
            setStatus('error');
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Gradient background */}
            <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '16rem',
                background: 'linear-gradient(to bottom, rgba(79,70,229,0.08), transparent)',
                pointerEvents: 'none'
            }} />

            <div style={{ width: '100%', maxWidth: '28rem', position: 'relative', zIndex: 10 }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <div style={{
                        width: '4rem', height: '4rem', margin: '0 auto',
                        background: '#4f46e5', borderRadius: '1rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 10px 25px rgba(79,70,229,0.3)', marginBottom: '1.5rem',
                        fontSize: '1.5rem', color: 'white'
                    }}>💳</div>
                    <p style={{ color: '#64748b', fontWeight: 500, marginBottom: '0.5rem' }}>Payment Request</p>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a' }}>Secure Checkout</h1>
                </div>

                {/* Payment Card */}
                <div style={{
                    background: 'white', borderRadius: '2rem',
                    boxShadow: '0 25px 50px rgba(0,0,0,0.08)',
                    border: '1px solid #e2e8f0',
                    padding: '2rem', textAlign: 'center',
                    position: 'relative', overflow: 'hidden'
                }}>
                    {status === 'loading' && (
                        <div style={{ padding: '2rem 0' }}>
                            <div className="pay-spinner" style={{
                                width: '3rem', height: '3rem', margin: '0 auto 1rem',
                                border: '4px solid #e2e8f0', borderTop: '4px solid #4f46e5',
                                borderRadius: '50%'
                            }} />
                            <p style={{ color: '#64748b' }}>Loading invoice...</p>
                        </div>
                    )}

                    {status === 'idle' && invoice && (
                        <div>
                            <p style={{ color: '#64748b', fontWeight: 500, marginBottom: '0.5rem' }}>Total Amount</p>
                            <div style={{ fontSize: '3rem', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '0.25rem', color: '#0f172a' }}>
                                {invoice.amount} <span style={{ fontSize: '1.25rem', color: '#94a3b8' }}>{invoice.currency}</span>
                            </div>
                            <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '2rem' }}>
                                {invoice.description || 'Payment Request'}
                            </p>
                            <button
                                onClick={payWithPasskey}
                                style={{
                                    width: '100%', padding: '1.25rem', fontSize: '1.1rem', fontWeight: 'bold',
                                    background: '#0f172a', color: 'white', border: 'none',
                                    borderRadius: '1rem', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                                    boxShadow: '0 10px 25px rgba(15,23,42,0.25)',
                                    transition: 'transform 0.15s'
                                }}
                                onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.02)')}
                                onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
                            >
                                🔐 Pay with Passkey
                            </button>
                            <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                                🛡️ Secured by Smart Wallet on Hoodi
                            </p>
                        </div>
                    )}

                    {status === 'scanning' && (
                        <div style={{ padding: '2rem 0' }}>
                            <div className="pay-spinner" style={{
                                width: '5rem', height: '5rem', margin: '0 auto 1.5rem',
                                border: '4px solid #e2e8f0', borderTop: '4px solid #4f46e5',
                                borderRadius: '50%'
                            }} />
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#0f172a' }}>Verifying Passkey</h3>
                            <p style={{ color: '#64748b' }}>Scan your face or fingerprint</p>
                        </div>
                    )}

                    {status === 'processing' && (
                        <div style={{ padding: '2rem 0' }}>
                            <div style={{
                                width: '4rem', height: '4rem', margin: '0 auto 1.5rem',
                                background: 'rgba(79,70,229,0.1)', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <div className="pay-spinner" style={{
                                    width: '2rem', height: '2rem',
                                    border: '4px solid #4f46e5', borderTop: '4px solid transparent',
                                    borderRadius: '50%'
                                }} />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#0f172a' }}>Processing</h3>
                            <p style={{ color: '#64748b' }}>Confirming on blockchain...</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div style={{ padding: '2rem 0' }}>
                            <div style={{
                                width: '5rem', height: '5rem', margin: '0 auto 1.5rem',
                                background: 'rgba(34,197,94,0.1)', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '2.5rem'
                            }}>✅</div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#0f172a' }}>Payment Successful</h3>
                            <p style={{ color: '#64748b', marginBottom: '1rem' }}>Transaction confirmed on Hoodi</p>
                            {txHash && (
                                <a
                                    href={`https://hoodi.etherscan.io/tx/${txHash}`}
                                    target="_blank" rel="noopener noreferrer"
                                    style={{ color: '#4f46e5', fontSize: '0.875rem', fontWeight: 500 }}
                                >
                                    View on Explorer →
                                </a>
                            )}
                            <div style={{ marginTop: '1.5rem' }}>
                                <button
                                    onClick={() => navigate('/dashboard')}
                                    style={{
                                        padding: '0.75rem 2rem', background: 'transparent',
                                        border: '1px solid #e2e8f0', borderRadius: '0.75rem',
                                        cursor: 'pointer', color: '#4f46e5', fontWeight: 500
                                    }}
                                >
                                    Back to Dashboard
                                </button>
                            </div>
                        </div>
                    )}

                    {status === 'error' && (
                        <div style={{ padding: '2rem 0' }}>
                            <div style={{
                                width: '5rem', height: '5rem', margin: '0 auto 1.5rem',
                                background: 'rgba(239,68,68,0.1)', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '2.5rem'
                            }}>❌</div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#0f172a' }}>Error</h3>
                            <p style={{ color: '#ef4444', marginBottom: '1.5rem', fontSize: '0.875rem' }}>{errorMsg}</p>
                            <button
                                onClick={() => { setStatus('idle'); setErrorMsg(''); }}
                                style={{
                                    padding: '0.75rem 2rem', background: '#4f46e5',
                                    color: 'white', border: 'none', borderRadius: '0.75rem',
                                    cursor: 'pointer', fontWeight: 500
                                }}
                            >
                                Try Again
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .pay-spinner {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default PayInvoice;
