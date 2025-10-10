import { Router } from "express";
import { ApplyPromotionController } from "../../controllers/promotion/ApplyPromotionController";
import { ValidationCouponController } from "../../controllers/promotion/ValidationCuponController";
import { InfosPromotionsStoreController } from "../../controllers/promotion/InfosPromotionsStoreController";

const router = Router();

router.post("/promotions/apply", (req, res) => ApplyPromotionController.apply(req, res));
router.post("/coupon/validate", (req, res) => ValidationCouponController.handle(req, res));
router.get('/store/promotions', (req, res, next) => { const ctrl = new InfosPromotionsStoreController(); Promise.resolve(ctrl.handle(req, res)).catch(next); });

export default router;
