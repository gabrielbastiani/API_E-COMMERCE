import { Router } from "express";
import { isAuthenticatedCustomer } from "../../middlewares/isAuthenticatedCustomer";
import * as CartCtrl from '../../controllers/cart/cart.controller';
import { CartController } from "../../controllers/cart/CartController";
const ctrlCart = new CartController();

const router = Router();

router.get("/", isAuthenticatedCustomer, ctrlCart.getCart.bind(ctrlCart));
router.post("/items", isAuthenticatedCustomer, ctrlCart.addItem.bind(ctrlCart));
router.put("/items/:itemId", isAuthenticatedCustomer, ctrlCart.updateItem.bind(ctrlCart));
router.delete("/items/:itemId", isAuthenticatedCustomer, ctrlCart.removeItem.bind(ctrlCart));
router.delete("/", isAuthenticatedCustomer, ctrlCart.clearCart.bind(ctrlCart));

router.post('/cart/abandoned', isAuthenticatedCustomer, CartCtrl.createOrUpdateAbandoned);
router.delete('/cart/abandoned/:cartId', isAuthenticatedCustomer, CartCtrl.deleteAbandoned);
router.get('/cart', isAuthenticatedCustomer, CartCtrl.getCart);

router.post('/cart/abandoned/:cartId/reminder', (req, res) => require('../../controllers/emails/email.controller').sendAbandonedReminder(req, res));

export default router;