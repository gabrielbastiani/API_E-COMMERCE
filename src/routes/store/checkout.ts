import { Router } from "express";
import { isAuthenticatedCustomer } from "../../middlewares/isAuthenticatedCustomer";
import * as CheckoutController from '../../controllers/checkout/checkout.controller';
import * as OrderController from '../../controllers/checkout/order.controller';
import { handleAsaasWebhook } from '../../controllers/checkout/webhook/asaas.controller';
import * as PaymentsController from '../../controllers/checkout/boletoWebScraping/payments.controller';
import { WebhookController } from "../../controllers/frete/webhook.controller";
import { calculateFreightHandler } from "../../controllers/frete/FreteController";

const router = Router();

router.get('/customer/address/list', isAuthenticatedCustomer, CheckoutController.getAddresses);
router.post('/address/customer/create', isAuthenticatedCustomer, CheckoutController.createAddress);
router.put('/customer/address/update', isAuthenticatedCustomer, CheckoutController.updateAddress);
router.put('/checkout/addresses/:id', isAuthenticatedCustomer, CheckoutController.updateAddress);
router.delete('/checkout/addresses/:id', isAuthenticatedCustomer, CheckoutController.deleteAddress);

router.post('/checkout/shipping', isAuthenticatedCustomer, CheckoutController.calculateShipping);
router.post('/shipment/calculate', calculateFreightHandler);

router.get('/checkout/payments/options', isAuthenticatedCustomer, CheckoutController.getPaymentOptions);

router.post('/checkout/order', isAuthenticatedCustomer, CheckoutController.placeOrder);
router.get('/order/:id', isAuthenticatedCustomer, OrderController.getOrderHandler);

router.post('/webhook/asaas', handleAsaasWebhook);
router.get('/payments/:paymentId/boleto', PaymentsController.getBoletoPdf);

router.post("/melhorenvio", require("express").raw({ type: "application/json", limit: "1mb" }), (req, res) => WebhookController.receberMelhorEnvio(req, res));

export default router;