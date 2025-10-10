import { Router } from "express";
import multer from "multer";
import uploadConfig from "../../config/multer";
import { isAuthenticatedEcommerce } from "../../middlewares/isAuthenticatedEcommerce";
import { checkRole } from "../../middlewares/checkRole";

import { PromotionController } from "../../controllers/promotion/PromotionController";
import { AllPromotionsController } from "../../controllers/promotion/AllPromotionsController";
import { StatusPromotionController } from "../../controllers/promotion/StatusPromotionController";
import { UpdatePromotionController } from "../../controllers/promotion/UpdatePromotionController";
import { GetUniquePromotionController } from "../../controllers/promotion/GetUniquePromotionController";
import { PromotionDeleteController } from "../../controllers/promotion/PromotionDeleteController";

const router = Router();
const upload_image_promotion = multer(uploadConfig.upload("./images/promotion"));

const ctrl = new PromotionController();
const update = new UpdatePromotionController();

router.post('/promotions', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), upload_image_promotion.any(), ctrl.create.bind(ctrl));
router.get('/promotions/get', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new AllPromotionsController().handle);
router.put('/promotion/active', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new StatusPromotionController().handle);
router.put('/promotions/:promotion_id', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), upload_image_promotion.fields([{ name: 'badgeFiles', maxCount: 10 }]), update.update.bind(update));
router.get('/promotions/unique_promotion', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new GetUniquePromotionController().handle);
router.delete('/promotions/delete', isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), async (req, res) => { return new PromotionDeleteController().handle(req, res); });

export default router;