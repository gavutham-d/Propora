import { Router } from 'express';
import { listPayments, createPayment, updatePaymentStatus } from '../controllers/paymentsController.js';

const router = Router();

router.get('/', listPayments);
router.post('/', createPayment);
router.patch('/:id', updatePaymentStatus);

export default router;
