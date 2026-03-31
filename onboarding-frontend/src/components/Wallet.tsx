import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSmartAccountClient } from 'permissionless';
import { toSafeSmartAccount } from 'permissionless/accounts';
import { createPublicClient, http, toHex } from 'viem';
import { sepolia } from 'viem/chains';
import { toWebAuthnAccount } from 'viem/account-abstraction';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { entryPoint07Address } from 'viem/account-abstraction';

const publicClient = createPublicClient({
    transport: http('https://ethereum-sepolia-rpc.publicnode.com'),
    chain: sepolia,
});

// Using a public Pimlico paymaster for demo (this might be rate limited)
const pimlicoUrl = 'https://api.pimlico.io/v2/sepolia/rpc?apikey=public';

interface WalletProps {
    walletAddress: string | null;
}

const Wallet: React.FC<WalletProps> = ({ walletAddress }) => {
    const navigate = useNavigate();
    const [address, setAddress] = useState<string>('');
    const [status, setStatus] = useState<string>('');
    const [, setSmartAccountClient] = useState<any>(null);

    useEffect(() => {
        if (walletAddress) {
            setAddress(walletAddress);
            setStatus('Wallet Loaded!');
            // We could reconstruct the smartAccountClient here if needed, 
            // but for display purposes and simple sending, the address might be enough 
            // or we reconstruct it when needed (like in send).
            // For now, we just set the address to show the wallet view.
        }
    }, [walletAddress]);

    const createWallet = async () => {
        try {
            setStatus('Creating Passkey...');
            console.log('Starting passkey creation...');

            // Generate a challenge (in production, this should come from the server)
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);

            // Create credential
            console.log('Calling navigator.credentials.create...');
            const credential = await navigator.credentials.create({
                publicKey: {
                    challenge,
                    rp: {
                        name: "Social Onboarding Wallet",
                        id: window.location.hostname,
                    },
                    user: {
                        id: new Uint8Array(16),
                        name: "user@example.com",
                        displayName: "User",
                    },
                    pubKeyCredParams: [{ type: "public-key", alg: -7 }], // ES256
                    authenticatorSelection: {
                        authenticatorAttachment: "platform",
                        userVerification: "required",
                    },
                },
            });

            console.log('Credential created:', credential);

            if (!credential) throw new Error('Failed to create credential');

            const response = (credential as PublicKeyCredential).response as AuthenticatorAttestationResponse;
            console.log('Credential response:', response);

            let publicKey: string;

            if (response.getPublicKey) {
                console.log('Getting public key...');
                const pubKeyBuffer = response.getPublicKey();
                if (pubKeyBuffer) {
                    const spki = new Uint8Array(pubKeyBuffer);
                    console.log('SPKI length:', spki.length);
                    // Extract raw public key from SPKI (remove 26-byte header for P256)
                    // SPKI format: 3059301306072a8648ce3d020106082a8648ce3d030107034200 + 04 + X + Y
                    // We want 04 + X + Y (65 bytes)
                    let rawKey = spki;
                    if (spki.length === 91) {
                        rawKey = spki.slice(26);
                    }
                    publicKey = toHex(rawKey);
                    console.log('Public Key extracted:', publicKey);
                } else {
                    throw new Error('No public key returned');
                }
            } else {
                console.error('response.getPublicKey is undefined');
                throw new Error('Browser does not support getPublicKey()');
            }

            const webAuthnAccount = toWebAuthnAccount({
                credential: {
                    id: credential.id,
                    publicKey: publicKey as `0x${string}`,
                },
            });
            console.log('WebAuthn account created');

            setStatus('Creating Smart Account...');

            const pimlicoClient = createPimlicoClient({
                transport: http(pimlicoUrl),
                entryPoint: {
                    address: entryPoint07Address,
                    version: '0.7',
                },
            });
            console.log('Pimlico client created');

            const safeAccount = await toSafeSmartAccount({
                client: publicClient,
                owners: [webAuthnAccount as any],
                version: '1.4.1',
                entryPoint: {
                    address: entryPoint07Address,
                    version: '0.7',
                },
            });
            console.log('Safe account created:', safeAccount);

            const smartClient = createSmartAccountClient({
                account: safeAccount,
                chain: sepolia,
                bundlerTransport: http(pimlicoUrl),
                paymaster: pimlicoClient,
                userOperation: {
                    estimateFeesPerGas: async () => {
                        console.log('Estimating fees...');
                        const gasPrice = await pimlicoClient.getUserOperationGasPrice();
                        console.log('Gas price:', gasPrice);
                        return gasPrice.fast;
                    },
                },
            });

            if (!safeAccount) throw new Error('Failed to create smart account');

            setAddress(safeAccount.address);
            setSmartAccountClient(smartClient);

            // Save wallet address and credentials to backend
            console.log('Saving to backend...');
            await fetch('/api/onboarding/user/wallet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // Include credentials to send session cookie
                credentials: 'include',
                body: JSON.stringify({
                    walletAddress: safeAccount.address,
                    credentialId: credential.id,
                    publicKey: publicKey
                }),
            });

            setStatus('Wallet Created and Saved!');
        } catch (error: any) {
            console.error('Error in createWallet:', error);
            setStatus(`Error: ${error.message}`);
            alert(`Error details: ${error.message} \n Check console for more info.`);
        }
    };

    return (
        <div className="wallet-container">
            {!address ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
                    <h2>Create Your Smart Wallet</h2>
                    <p>Secure your assets with biometric authentication.</p>
                    <button className="btn-primary" onClick={createWallet} style={{ marginTop: '2rem' }}>
                        Create Passkey Wallet
                    </button>
                    <div className="wallet-status" style={{ marginTop: '1rem' }}>{status}</div>
                </div>
            ) : (
                <div className="wallet-grid">
                    <div className="wallet-balance-card">
                        <h3>Your Wallet</h3>
                        <div className="address-badge" onClick={() => navigator.clipboard.writeText(address)}>
                            {address.slice(0, 6)}...{address.slice(-4)}
                        </div>
                        <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>Sepolia Network</p>
                    </div>

                    <div className="transaction-section" style={{ alignItems: 'center', textAlign: 'center' }}>
                        <h3>Actions</h3>
                        <p style={{ marginBottom: '2rem' }}>Send assets to other wallets or contracts.</p>

                        <button className="btn-primary" onClick={() => navigate('/send')} style={{ width: '100%', maxWidth: '300px' }}>
                            Send Assets →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Wallet;
