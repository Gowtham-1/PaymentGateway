import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController';

const router = Router();

router.get('/', PaymentController.getAllPayments);
router.post('/', PaymentController.createPayment);
router.get('/:id', PaymentController.getPaymentById);
router.post('/:id/pay', PaymentController.processPayment);

export default router;
