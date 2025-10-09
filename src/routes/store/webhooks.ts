import { Router } from "express";
import { handleAsaasWebhook } from '../../controllers/checkout/webhook/asaas.controller';
import * as PaymentsController from '../../controllers/checkout/boletoWebScraping/payments.controller';

const router = Router();

router.post('/webhook/asaas', handleAsaasWebhook);
router.get('/payments/:paymentId/boleto', PaymentsController.getBoletoPdf);

export default router;