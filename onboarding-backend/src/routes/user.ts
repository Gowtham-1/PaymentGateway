import express from 'express';
import { saveWallet, getUserProfile } from '../controllers/userController.js';
import { savePushSubscription, triggerPaymentNotification } from '../controllers/pushController.js';

const router = express.Router();

router.post('/wallet', saveWallet);
router.get('/profile', getUserProfile);
router.post('/push-subscription', savePushSubscription);
router.post('/notify', triggerPaymentNotification);

export default router;
