import type { Request, Response } from 'express';
import webpush from 'web-push';
import { User } from '../models/User.js';
import { config } from '../config.js';

export const savePushSubscription = async (req: Request, res: Response): Promise<void> => {
    if (!req.isAuthenticated()) {
        console.error('[PUSH] Failed to save subscription: Unauthorized (user not logged in)');
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }

    const subscription = req.body;
    try {
        await User.findByIdAndUpdate(
            (req.user as any)._id,
            { $addToSet: { pushSubscriptions: subscription } }
        );
        res.status(201).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save subscription' });
    }
};

export const triggerPaymentNotification = async (req: Request, res: Response): Promise<void> => {
    // The payment gateway hits this API
    console.log('[PUSH] notify triggered:', req.body);
    const { email, amount, currency, paymentId } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user || (!user.pushSubscriptions || user.pushSubscriptions.length === 0)) {
            res.status(404).json({ message: 'User or subscription not found' });
            return;
        }

        const payload = JSON.stringify({
            title: 'New Payment Request',
            body: `You have a new request for ${amount} ${currency}`,
            url: `${config.cloudflareUrl}/pay/${paymentId}`
        });

        const pushPromises = user.pushSubscriptions.map((sub: any) =>
            webpush.sendNotification(sub, payload).catch(err => {
                console.error('Push error:', err);
            })
        );

        await Promise.all(pushPromises);
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Error triggering push:', err);
        res.status(500).json({ error: 'Failed to notify user' });
    }
};
