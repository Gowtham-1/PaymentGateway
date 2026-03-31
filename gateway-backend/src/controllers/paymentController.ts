import { Request, Response } from 'express';
import { PaymentModel } from '../models/paymentModel';
import { CreatePaymentRequest, SignatureData } from '../types';
import { io } from '../server';
import { config } from '../config';
import { ethers } from 'ethers';

const backendWallet = new ethers.Wallet(process.env.BACKEND_PRIVATE_KEY || '0x0123456789012345678901234567890123456789012345678901234567890123');
const DEFAULT_MERCHANT_ADDRESS = process.env.MERCHANT_ADDRESS || '0x4321000000000000000000000000000000000000'; // Replace with real merchant address

export const PaymentController = {
    getAllPayments: (req: Request, res: Response) => {
        const payments = PaymentModel.findAll();
        res.json(payments);
    },

    getPaymentById: (req: Request, res: Response) => {
        const payment = PaymentModel.findById(req.params.id);
        if (!payment) {
            res.status(404).json({ message: 'Payment not found' });
            return;
        }
        res.json(payment);
    },

    createPayment: async (req: Request<{}, {}, CreatePaymentRequest>, res: Response) => {
        const { customerEmail, amount, currency } = req.body;

        // 1. Determine Token Address & Decimals
        const isNative = currency === 'ETH' || currency === 'BNB';
        const tokenAddress = isNative
            ? '0x0000000000000000000000000000000000000000'
            : '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'; // Dummy USDC address
        const decimals = isNative ? 18 : 6;

        // 2. Parse Amount safely (assuming `amount` is a string like "250")
        const amountInWei = ethers.parseUnits(amount.toString(), decimals).toString();

        // 3. Create the Base Payment Record
        const newPayment = PaymentModel.create(req.body);

        // 4. GENERATE BACKEND SIGNATURE for Smart Contract Flow
        // Payload matches: keccak256(abi.encodePacked(paymentId, token, merchant, amount))
        const messageHash = ethers.solidityPackedKeccak256(
            ['string', 'address', 'address', 'uint256'],
            [newPayment.id, tokenAddress, DEFAULT_MERCHANT_ADDRESS, amountInWei]
        );

        // Sign the message (this adds the standard \x19Ethereum Signed Message:\n32 prefix)
        const signature = await backendWallet.signMessage(ethers.getBytes(messageHash));

        // Save the signature configuration onto the payment
        newPayment.signatureData = {
            tokenAddress,
            merchantAddress: DEFAULT_MERCHANT_ADDRESS,
            amountInWei,
            signature
        };

        if (customerEmail) {
            // Emit event only to the specific user's room (real-time active session)
            io.to(customerEmail).emit('payment-created', newPayment);

            // Trigger Push Notification (for background passive session)
            const gatewayOrigin = req.headers.origin || `http://${req.headers.host}`;
            try {
                await fetch(`${config.onboardingBackendUrl}/api/user/notify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: customerEmail,
                        amount,
                        currency,
                        paymentId: newPayment.id,
                        gatewayOrigin
                    })
                });
            } catch (err) {
                console.error('Failed to trigger push notification:', err);
            }
        } else {
            // Fallback: Emit to everyone (legacy behavior)
            io.emit('payment-created', newPayment);
        }

        // In a real app, this link would point to the frontend route
        const link = `${config.frontendUrl}/pay/${newPayment.id}`;

        res.status(201).json({
            success: true,
            payment: newPayment,
            link: link
        });
    },

    processPayment: (req: Request, res: Response) => {
        const { id } = req.params;
        // Simulate wallet address
        const customerAddress = '0x' + Math.random().toString(36).substr(2, 40);

        const updatedPayment = PaymentModel.updateStatus(id, 'completed', customerAddress);

        if (!updatedPayment) {
            res.status(404).json({ message: 'Payment not found' });
            return;
        }

        res.json({
            success: true,
            payment: updatedPayment
        });
    }
};
