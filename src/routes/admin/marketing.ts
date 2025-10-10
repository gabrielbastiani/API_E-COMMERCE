import { Router } from "express";
import multer from "multer";
import uploadConfig from "../../config/multer";
import { isAuthenticatedEcommerce } from "../../middlewares/isAuthenticatedEcommerce";
import { checkRole } from "../../middlewares/checkRole";

import { UpdateViewsPuplicationsController } from "../../controllers/marketing_publication/UpdateViewsPuplicationsController";
import { MarketingPublicationController } from "../../controllers/marketing_publication/MarketingPublicationController";
import { MarketingUpdateDataController } from "../../controllers/marketing_publication/MarketingUpdateDataController";
import { MarketingPublicationDeleteDeleteController } from "../../controllers/marketing_publication/MarketingPublicationDeleteDeleteController";
import { MarketingDeleteImageController } from "../../controllers/marketing_publication/MarketingDeleteImageController";
import { IntervalUpdateDataController } from "../../controllers/marketing_publication/IntervalUpdateDataController";
import { IntervalBannerController } from "../../controllers/marketing_publication/IntervalBannerController";
import { IntervalBannerPageController } from "../../controllers/marketing_publication/IntervalBannerPageController";
import { GenerateExcelDeletePublicationController } from "../../controllers/marketing_publication/GenerateExcelDeletePublicationController";
import { ExistingPublicationPageController } from "../../controllers/marketing_publication/ExistingPublicationPageController";
import { ExistingIntervalBannerController } from "../../controllers/marketing_publication/ExistingIntervalBannerController";
import { DeleteIntervalBannerController } from "../../controllers/marketing_publication/DeleteIntervalBannerController";
import { CreateMarketingPublicationController } from "../../controllers/marketing_publication/CreateMarketingPublicationController";
import { BulkDeleteMarketingPublicationController } from "../../controllers/marketing_publication/BulkDeleteMarketingPublicationController";
import { AllMarketingPublicationController } from "../../controllers/marketing_publication/AllMarketingPublicationController";
import { ExistingSidebarBannerPageController } from "../../controllers/marketing_publication/ExistingSidebarBannerPageController";
import { PopupStoreMarketingPublicationController } from "../../controllers/marketing_publication/PopupStoreMarketingPublicationController";
import { SlideStoreMarketingPublicationController } from "../../controllers/marketing_publication/SlideStoreMarketingPublicationController";
import { ExistingMosaicController } from "../../controllers/marketing_publication/ExistingMosaicController";

const router = Router();
const upload_image_marketing = multer(uploadConfig.upload("./images/marketing"));
const temp_file = multer(uploadConfig.upload("./temp_file"));

router.post('/marketing_publication/create', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), upload_image_marketing.single('file'), new CreateMarketingPublicationController().handle);
router.patch('/marketing_publication/:marketingPublication_id/clicks', new UpdateViewsPuplicationsController().handle);
router.get('/marketing_publication/store_publications/slides', new MarketingPublicationController().handle);
router.put('/marketing_publication/update', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), upload_image_marketing.single('file'), new MarketingUpdateDataController().handle);
router.delete('/marketing_publication/delete_publications', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new MarketingPublicationDeleteDeleteController().handle);
router.put('/marketing_publication/delete_publications/delete_image', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new MarketingDeleteImageController().handle);
router.put('/marketing_publication/interval_banner/update_data', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new IntervalUpdateDataController().handle);
router.post('/marketing_publication/interval_banner', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new IntervalBannerController().handle);
router.get('/marketing_publication/download_excel_delete_marketing', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new GenerateExcelDeletePublicationController().handle);
router.get('/marketing_publication/existing_publication', new ExistingPublicationPageController().handle);
router.get('/marketing_publication/interval_banner/existing_interval', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new ExistingIntervalBannerController().handle);
router.delete('/marketing_publication/delete', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new DeleteIntervalBannerController().handle);
router.post('/marketing_publication/bulk_delete_publications', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), temp_file.single('file'), new BulkDeleteMarketingPublicationController().handle);
router.get('/marketing_publication/all_publications', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new AllMarketingPublicationController().handle);

// store-read endpoints that were in marketing group (keep here too)
router.get('/marketing_publication/existing_sidebar', new ExistingSidebarBannerPageController().handle);
router.get('/marketing_publication/store_publications/slides', new SlideStoreMarketingPublicationController().handle);
router.get('/marketing_publication/store_publications/popup', new PopupStoreMarketingPublicationController().handle);
router.get('/marketing_publication/interval_banner/page_banner', new IntervalBannerPageController().handle);
router.get('/marketing_publication/existing_mosaic', new ExistingMosaicController().handle);

export default router;