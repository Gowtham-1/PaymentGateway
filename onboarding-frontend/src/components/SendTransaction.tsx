import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSmartAccountClient } from 'permissionless';
import { toSafeSmartAccount } from 'permissionless/accounts';
import { createPublicClient, http, parseEther, encodeFunctionData, parseUnits } from 'viem';
import { hoodi } from '../network';
import { toWebAuthnAccount } from 'viem/account-abstraction';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { entryPoint07Address } from 'viem/account-abstraction';
import { config } from '../config';

const publicClient = createPublicClient({
    transport: http('https://rpc.hoodi.ethpandaops.io'),
    chain: hoodi,
});

const pimlicoUrl = config.pimlicoUrl;

const erc20Abi = [
    {
        name: 'transfer',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'recipient', type: 'address' },
            { name: 'amount', type: 'uint256' }
        ],
        outputs: [{ name: '', type: 'bool' }]
    }
];

const SendTransaction: React.FC = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState<string>('Initializing...');
    const [smartAccountClient, setSmartAccountClient] = useState<any>(null);

    // Form State
    const [recipient, setRecipient] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [tokenType, setTokenType] = useState<'ETH' | 'ERC20'>('ETH');
    const [tokenAddress, setTokenAddress] = useState<string>('');

    useEffect(() => {
        const setupWallet = async () => {
            try {
                const res = await fetch('/api/onboarding/user/profile', {
                    credentials: 'include',
                });
                if (res.ok) {
                    const resJson = await res.json();
                    const data = resJson.user;
                    if (data && data.walletAddress && data.credentialId && data.publicKey) {
                        let storedPublicKey = data.publicKey as `0x${string}`;
                        if (storedPublicKey.length === 184) {
                            storedPublicKey = `0x${storedPublicKey.slice(54)}` as `0x${string}`;
                        }

                        const webAuthnAccount = toWebAuthnAccount({
                            credential: {
                                id: data.credentialId,
                                publicKey: storedPublicKey,
                            },
                        });

                        const pimlicoClient = createPimlicoClient({
                            transport: http(pimlicoUrl),
                            entryPoint: {
                                address: entryPoint07Address,
                                version: '0.7',
                            },
                        });

                        const safeAccount = await toSafeSmartAccount({
                            client: publicClient,
                            owners: [webAuthnAccount as any],
                            version: '1.4.1',
                            entryPoint: {
                                address: entryPoint07Address,
                                version: '0.7',
                            },
                            address: data.walletAddress as `0x${string}`,
                        });

                        const smartClient = createSmartAccountClient({
                            account: safeAccount,
                            chain: hoodi,
                            bundlerTransport: http(pimlicoUrl),
                            paymaster: pimlicoClient,
                            userOperation: {
                                estimateFeesPerGas: async () => {
                                    return (await pimlicoClient.getUserOperationGasPrice()).fast;
                                },
                            },
                        });

                        setSmartAccountClient(smartClient);
                        setStatus('');
                    }
                }
            } catch (error) {
                console.error('Failed to setup wallet:', error);
                setStatus('Failed to load wallet');
            }
        };
        setupWallet();
    }, []);

    const sendTransaction = async () => {
        if (!smartAccountClient) return;
        if (!recipient || !amount) {
            setStatus('Please fill in all fields');
            return;
        }

        try {
            setStatus('Sending Transaction...');

            let txHash;

            if (tokenType === 'ETH') {
                txHash = await smartAccountClient.sendTransaction({
                    to: recipient as `0x${string}`,
                    value: parseEther(amount),
                    data: '0x',
                });
            } else {
                if (!tokenAddress) {
                    setStatus('Please enter token address');
                    return;
                }
                const data = encodeFunctionData({
                    abi: erc20Abi,
                    functionName: 'transfer',
                    args: [recipient as `0x${string}`, parseUnits(amount, 18)]
                });

                txHash = await smartAccountClient.sendTransaction({
                    to: tokenAddress as `0x${string}`,
                    value: parseEther('0'),
                    data: data,
                });
            }

            setStatus(`Transaction Sent! Hash: ${txHash}`);
        } catch (error: any) {
            console.error(error);
            setStatus(`Error: ${error.message}`);
        }
    };

    return (
        <div className="dashboard-card fade-in">
            <div className="dashboard-header">
                <button className="btn-secondary" onClick={() => navigate('/dashboard')}>
                    ← Back
                </button>
                <h3>Send Transaction</h3>
                <div style={{ width: '80px' }}></div> {/* Spacer for centering */}
            </div>

            <div className="dashboard-content">
                <div className="transaction-section" style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
                    <div className="wallet-status">{status}</div>

                    <div className="form-group">
                        <label>Recipient Address</label>
                        <input
                            type="text"
                            placeholder="0x..."
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>Asset</label>
                        <select
                            value={tokenType}
                            onChange={(e) => setTokenType(e.target.value as 'ETH' | 'ERC20')}
                        >
                            <option value="ETH">Native ETH</option>
                            <option value="ERC20">ERC20 Token</option>
                        </select>
                    </div>

                    {tokenType === 'ERC20' && (
                        <div className="form-group">
                            <label>Token Address</label>
                            <input
                                type="text"
                                placeholder="0x..."
                                value={tokenAddress}
                                onChange={(e) => setTokenAddress(e.target.value)}
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label>Amount</label>
                        <input
                            type="text"
                            placeholder="0.0"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>

                    <button className="btn-primary" onClick={sendTransaction} style={{ width: '100%', marginTop: '1rem' }}>
                        Confirm & Send
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SendTransaction;
