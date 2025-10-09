import { Router } from "express";
import { OffersProductController } from "../../controllers/product/OffersProductController";
import { FindUniqueProductStoreController } from "../../controllers/product/FindUniqueProductStoreController";
import { HighlightsProductsController } from "../../controllers/product/HighlightsProductsController";
import { ProductPageStoreDetailsController } from "../../controllers/product/ProductPageStoreDetailsController";
import { ProductsRecentlyViewsController } from "../../controllers/product/ProductsRecentlyViewsController";
import { UpdateViewsController } from "../../controllers/product/UpdateViewsController";
import { LookupController } from "../../controllers/product/LookupController";
import { ProductsBatchController } from "../../controllers/product/ProductsBatchController";
import { GetVariantUniqueController } from "../../controllers/product/variation/GetVariantUniqueController";

const router = Router();
const productsBatchController = new ProductsBatchController();

router.get('/products/offers', (req, res) => new OffersProductController().handle(req, res));
router.get('/product/unique/data', (req, res) => new FindUniqueProductStoreController().handle(req, res));
router.get('/products/highlights', (req, res) => new HighlightsProductsController().handle(req, res));
router.get('/product/page', (req, res) => new ProductPageStoreDetailsController().handle(req, res));
router.post("/products/batch", (req, res) => productsBatchController.handle(req, res));
router.post('/product/recently/views', (req, res) => new ProductsRecentlyViewsController().handle(req, res));
router.patch("/product/:product_id/views", (req, res) => new UpdateViewsController().handle(req, res));
router.post('/catalog/lookup', (req, res) => new LookupController().handle(req, res));
router.get('/variant/get/unique', (req, res) => new GetVariantUniqueController().handle(req, res));

export default router;