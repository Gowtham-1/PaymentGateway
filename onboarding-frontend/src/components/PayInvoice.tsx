import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createSmartAccountClient } from 'permissionless';
import { toSafeSmartAccount } from 'permissionless/accounts';
import { createPublicClient, http, encodeFunctionData } from 'viem';
import { sepolia } from 'viem/chains';
import { toWebAuthnAccount } from 'viem/account-abstraction';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { entryPoint07Address } from 'viem/account-abstraction';
import { config } from '../config';

const publicClient = createPublicClient({ transport: http('https://ethereum-sepolia-rpc.publicnode.com'), chain: sepolia });
const pimlicoUrl = 'https://api.pimlico.io/v2/sepolia/rpc?apikey=public';

// Replace with deployed Gateway Address
const GATEWAY_CONTRACT_ADDRESS = '0xA1B2C3D4E5F67890123456789012345678901234';

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

const PayInvoice: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [status, setStatus] = useState<string>('Loading Invoice...');
    const [invoice, setInvoice] = useState<any>(null);

    useEffect(() => {
        const loadInvoice = async () => {
            try {
                // Fetch payment details and signature from gateway backend
                const response = await fetch(`${config.gatewayUrl}/api/payments/${id}`);
                const data = await response.json();
                setInvoice(data);
                setStatus('');
            } catch (err) {
                setStatus('Failed to load invoice.');
            }
        };
        if (id) loadInvoice();
    }, [id]);

    const payWithPasskey = async () => {
        if (!invoice || !invoice.signatureData) {
            setStatus('Missing signature data!');
            return;
        }

        setStatus('Authenticating Passkey...');
        try {
            // Prepare Wallet Context
            const res = await fetch('/api/onboarding/user/profile', { credentials: 'include' });
            if (!res.ok) throw new Error('Not logged in');
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
                account: safeAccount, chain: sepolia, bundlerTransport: http(pimlicoUrl), paymaster: pimlicoClient,
                userOperation: { estimateFeesPerGas: async () => (await pimlicoClient.getUserOperationGasPrice()).fast }
            });

            setStatus('Executing Smart Contract Call...');
            const sigData = invoice.signatureData;

            let txHash;
            // Native ETH vs ERC20 routing
            if (sigData.tokenAddress === '0x0000000000000000000000000000000000000000') {
                const callData = encodeFunctionData({
                    abi: gatewayAbi,
                    functionName: 'processNativePayment',
                    args: [invoice.id, sigData.merchantAddress, sigData.signature]
                });
                txHash = await smartClient.sendTransaction({
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
                txHash = await smartClient.sendTransaction({
                    to: GATEWAY_CONTRACT_ADDRESS,
                    value: BigInt(0),
                    data: callData,
                });
            }

            setStatus(`Payment Successful! Hash: ${txHash}`);
        } catch (err: any) {
            console.error(err);
            setStatus(`Transaction Failed: ${err.message}`);
        }
    };

    return (
        <div className="dashboard-card fade-in">
            <div className="dashboard-header">
                <button className="btn-secondary" onClick={() => navigate('/dashboard')}>← Back</button>
                <h3>Secure Checkout</h3>
                <div style={{ width: '80px' }}></div>
            </div>
            <div className="dashboard-content" style={{ textAlign: 'center' }}>
                <div className="wallet-status" style={{ marginBottom: '1rem' }}>{status}</div>
                {invoice && (
                    <div style={{ maxWidth: '400px', margin: '0 auto', background: '#f8fafc', padding: '2rem', borderRadius: '1rem' }}>
                        <h2 style={{ color: '#0f172a', marginBottom: '0.5rem' }}>${invoice.amount} {invoice.currency}</h2>
                        <p style={{ color: '#64748b', marginBottom: '2rem' }}>{invoice.description || 'Payment Request'}</p>

                        <button className="btn-primary" onClick={payWithPasskey} style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}>
                            Pay securely with Passkey
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PayInvoice;
