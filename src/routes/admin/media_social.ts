import { Router } from "express";
import multer from "multer";
import uploadConfig from "../../config/multer";
import { isAuthenticatedEcommerce } from "../../middlewares/isAuthenticatedEcommerce";
import { checkRole } from "../../middlewares/checkRole";

import { CreateMediaSocialEcommerceController } from "../../controllers/configuration_ecommerce/media_social/CreateMediaSocialEcommerceController";
import { DeleteMediasSocialsEcommerceController } from "../../controllers/configuration_ecommerce/media_social/DeleteMediasSocialsEcommerceController";
import { MediasSocialsEcommerceController } from "../../controllers/configuration_ecommerce/media_social/MediasSocialsEcommerceController";
import { UpdateMediaSocialEcommerceController } from "../../controllers/configuration_ecommerce/media_social/UpdateMediaSocialEcommerceController";

const router = Router();
const upload_image_mediaSocial = multer(uploadConfig.upload("./images/mediaSocial"));

router.post('/create/media_social', isAuthenticatedEcommerce, checkRole(['SUPER_ADMIN']), upload_image_mediaSocial.single('file'), new CreateMediaSocialEcommerceController().handle);
router.put('/update/media_social', isAuthenticatedEcommerce, checkRole(['SUPER_ADMIN']), upload_image_mediaSocial.single('file'), new UpdateMediaSocialEcommerceController().handle);
router.get('/get/media_social', new MediasSocialsEcommerceController().handle);
router.delete('/delete/media_social', isAuthenticatedEcommerce, checkRole(['SUPER_ADMIN']), new DeleteMediasSocialsEcommerceController().handle);

export default router;