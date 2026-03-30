import express from 'express';
import passport from 'passport';
import { googleCallback, logout, loginSuccess } from '../controllers/authController.js';

const router = express.Router();

router.get('/google', (req, res, next) => {
    const callbackURL = `${req.protocol}://${req.get('host')}/auth/google/callback`;
    console.log('Initiating Google Auth with callbackURL:', callbackURL);
    passport.authenticate('google', { scope: ['profile', 'email'], callbackURL } as any)(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
    const callbackURL = `${req.protocol}://${req.get('host')}/auth/google/callback`;
    passport.authenticate('google', { failureRedirect: '/', callbackURL } as any)(req, res, next);
}, googleCallback);

router.get('/login/success', loginSuccess);

router.get('/logout', logout);

export default router;
