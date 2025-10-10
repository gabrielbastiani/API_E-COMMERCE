import { Router } from "express";

// admin
import adminUsers from "./admin/users";
import adminNotifications from "./admin/notifications";
import adminCustomers from "./admin/customers";
import adminColors from "./admin/colors";
import adminConfig from "./admin/config";
import adminTemplates from "./admin/templates";
import adminMarketing from "./admin/marketing";
import adminNewsletter from "./admin/newsletter";
import adminFormContact from "./admin/form_contact";
import adminSeo from "./admin/seo";
import adminMediaSocial from "./admin/media_social";
import adminExportData from "./admin/exportdata";
import adminCategory from "./admin/category";
import adminProduct from "./admin/product";
import adminPromotion from "./admin/promotion";
import adminBuyTogether from "./admin/buyTogether";
import adminFilters from "./admin/filters";
import adminMenus from "./admin/menus";
import adminComments from "./admin/comments";

// store
import storeMarketing from "./store/marketing";
import storeCategory from "./store/category";
import storeProducts from "./store/products";
import storeCart from "./store/cart";
import storeMenu from "./store/menu";
import storeAddress from "./store/address";
import storeCheckout from "./store/checkout";
import storeFavorite from "./store/favorite";
import storeReview from "./store/review";
import storeWebhooks from "./store/webhooks";
import storeComments from "./store/comments";
import storeQuestion from "./store/question";
import promotionsStore from "./store/promotion";

const router = Router();

// Register admin route modules (they contain full paths as before)
router.use(adminUsers);
router.use(adminComments);
router.use(adminNotifications);
router.use(adminCustomers);
router.use(adminColors);
router.use(adminConfig);
router.use(adminTemplates);
router.use(adminMarketing);
router.use(adminNewsletter);
router.use(adminFormContact);
router.use(adminSeo);
router.use(adminMediaSocial);
router.use(adminExportData);
router.use(adminCategory);
router.use(adminProduct);
router.use(adminPromotion);
router.use(adminBuyTogether);
router.use(adminFilters);
router.use(adminMenus);

// Register store route modules
router.use(storeMarketing);
router.use(storeCategory);
router.use(storeProducts);
router.use(storeCart);
router.use(storeMenu);
router.use(storeAddress);
router.use(storeCheckout);
router.use(storeFavorite);
router.use(storeReview);
router.use(storeWebhooks);
router.use(storeComments);
router.use(storeQuestion);
router.use(promotionsStore);

// export same name as before if app imports { router }
export { router };
export default router;