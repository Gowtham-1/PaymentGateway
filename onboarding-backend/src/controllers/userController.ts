import type { Request, Response } from 'express';
import { User } from '../models/User.js';

export const saveWallet = async (req: Request, res: Response): Promise<void> => {
    console.log('saveWallet called');
    console.log('Session:', req.session);
    console.log('User:', req.user);
    console.log('Body:', req.body);

    if (!req.isAuthenticated()) {
        console.log('Unauthorized access attempt to saveWallet');
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }

    const { walletAddress, credentialId, publicKey } = req.body;
    if (!walletAddress) {
        res.status(400).json({ message: 'Wallet address is required' });
        return;
    }

    try {
        const user = await User.findByIdAndUpdate(
            (req.user as any)._id,
            { walletAddress, credentialId, publicKey },
            { new: true }
        );
        console.log('Wallet saved for user:', user?.email);
        res.json(user);
    } catch (error) {
        console.error('Error saving wallet:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};



export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
    if (!req.isAuthenticated()) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }

    try {
        const user = await User.findById((req.user as any)._id);
        if (!user) {
            console.log('User not found in DB');
            res.status(404).json({ message: 'User not found' });
            return;
        }
        console.log('getUserProfile returning:', user);
        res.json({
            user: {
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                googleId: user.googleId,
                walletAddress: user.walletAddress,
                credentialId: user.credentialId,
                publicKey: user.publicKey,
            },
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
