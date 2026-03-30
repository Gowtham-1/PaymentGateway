import { Request, Response } from 'express';
import { PaymentModel } from '../models/paymentModel';
import { CreatePaymentRequest } from '../types';
import { io } from '../server';
import { config } from '../config';

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
        const newPayment = PaymentModel.create(req.body);

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
