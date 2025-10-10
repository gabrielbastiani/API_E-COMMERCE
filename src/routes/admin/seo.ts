import { Router } from "express";
import multer from "multer";
import uploadConfig from "../../config/multer";
import { isAuthenticatedEcommerce } from "../../middlewares/isAuthenticatedEcommerce";
import { checkRole } from "../../middlewares/checkRole";

import { CreateSeoEcommerceController } from "../../controllers/configuration_ecommerce/seo/CreateSeoEcommerceController";
import { UpdateSeoSettingsController } from "../../controllers/configuration_ecommerce/seo/UpdateSeoSettingsController";
import { GetSeoUniqueController } from "../../controllers/configuration_ecommerce/seo/GetSeoUniqueController";
import { DeleteKeywordController } from "../../controllers/configuration_ecommerce/seo/DeleteKeywordController";
import { AddKeywordController } from "../../controllers/configuration_ecommerce/seo/AddKeywordController";
import { AddOgImagesController } from "../../controllers/configuration_ecommerce/seo/AddOgImagesController";
import { DeleteOgImageController } from "../../controllers/configuration_ecommerce/seo/DeleteOgImageController";
import { AddTwitterImagesController } from "../../controllers/configuration_ecommerce/seo/AddTwitterImagesController";
import { DeleteTwitterImageController } from "../../controllers/configuration_ecommerce/seo/DeleteTwitterImageController";
import { GetSeoEcommercePageController } from "../../controllers/configuration_ecommerce/seo/GetSeoEcommercePageController";
import { AllSeoEcommercePageController } from "../../controllers/configuration_ecommerce/seo/AllSeoEcommercePageController";

const router = Router();
const upload_image_seo = multer(uploadConfig.upload("./images/seo"));

router.post('/seo/create', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), upload_image_seo.fields([{ name: 'ogImages', maxCount: 5 }, { name: 'twitterImages', maxCount: 5 }]), new CreateSeoEcommerceController().handle);
router.put('/seo/update_seo', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), upload_image_seo.fields([{ name: 'ogImages', maxCount: 5 }, { name: 'twitterImages', maxCount: 5 }]), new UpdateSeoSettingsController().handle);
router.get('/seo/get_seo', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new GetSeoUniqueController().handle);
router.delete('/seo/keyword', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new DeleteKeywordController().handle);
router.post('/seo/keyword', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new AddKeywordController().handle);
router.post('/seo/og-images', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), upload_image_seo.array('images'), new AddOgImagesController().handle);
router.delete('/seo/og-image', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new DeleteOgImageController().handle);
router.post('/seo/twitter-images', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), upload_image_seo.array('images'), new AddTwitterImagesController().handle);
router.delete('/seo/twitter-image', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new DeleteTwitterImageController().handle);
router.get('/seo/get_page', new GetSeoEcommercePageController().handle);
router.get('/seo/all_seos', new AllSeoEcommercePageController().handle);

export default router;