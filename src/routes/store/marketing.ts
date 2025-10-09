import { Router } from "express";
import { SlideStoreMarketingPublicationController } from "../../controllers/marketing_publication/SlideStoreMarketingPublicationController";
import { PopupStoreMarketingPublicationController } from "../../controllers/marketing_publication/PopupStoreMarketingPublicationController";
import { IntervalBannerPageController } from "../../controllers/marketing_publication/IntervalBannerPageController";
import { ExistingMosaicController } from "../../controllers/marketing_publication/ExistingMosaicController";

const router = Router();

router.get('/marketing_publication/existing_sidebar', (req, res) => require('../../controllers/marketing_publication/ExistingSidebarBannerPageController').ExistingSidebarBannerPageController.prototype.handle.call(null, req, res));
router.get('/marketing_publication/store_publications/slides', (req, res) => new SlideStoreMarketingPublicationController().handle(req, res));
router.get('/marketing_publication/store_publications/popup', (req, res) => new PopupStoreMarketingPublicationController().handle(req, res));
router.get('/marketing_publication/interval_banner/page_banner', (req, res) => new IntervalBannerPageController().handle(req, res));
router.get('/marketing_publication/existing_mosaic', (req, res) => new ExistingMosaicController().handle(req, res));

export default router;