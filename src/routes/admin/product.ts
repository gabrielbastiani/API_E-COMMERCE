import { Router } from "express";
import multer from "multer";
import uploadConfig from "../../config/multer";
import { isAuthenticatedEcommerce } from "../../middlewares/isAuthenticatedEcommerce";
import { checkRole } from "../../middlewares/checkRole";

import { CreateProductController } from "../../controllers/product/CreateProductController";
import { AllProductsController } from "../../controllers/product/AllProductsController";
import { CmsGetProductController } from "../../controllers/product/CmsGetProductController";
import { ProductDeleteController } from "../../controllers/product/ProductDeleteController";
import { searchController } from "../../controllers/product/NavBarSearchProductStoreController";
import { ProductUpdateDataController } from "../../controllers/product/ProductUpdateDataController";
import { GetVariationsController } from "../../controllers/product/variation/GetVariationsController";
import { ProductsBatchController } from "../../controllers/product/ProductsBatchController";
import { LookupController } from "../../controllers/product/LookupController";
import { StatusProductController } from "../../controllers/product/StatusProductController";

const router = Router();
const upload_image_product = multer(uploadConfig.upload("./images/product"));
const fields = [
    { name: "images", maxCount: 50 },
    { name: "videos", maxCount: 15 },
    { name: "variantImages", maxCount: 50 },
    { name: "attributeImages", maxCount: 30 },
    { name: 'characteristicImages', maxCount: 20 }
];

const productUpdateController = new ProductUpdateDataController();
const productsBatchController = new ProductsBatchController();

router.post("/product/create", isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), upload_image_product.fields(fields), new CreateProductController().handle);
router.get('/get/products', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new AllProductsController().handle);
router.get('/product/cms/get', isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), new CmsGetProductController().handle);
router.put("/product/update", isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), upload_image_product.any(), productUpdateController.handle.bind(productUpdateController));
router.delete("/products/delete", isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), async (req, res) => { await new ProductDeleteController().handle(req, res); });
router.put('/product/status', isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), new StatusProductController().handle);

router.get('/variant/get', new GetVariationsController().handle);
router.post("/products/batch", (req, res) => productsBatchController.handle(req, res));
router.get("/products/busca", searchController);
router.post('/catalog/lookup', (req, res) => new LookupController().handle(req, res));

export default router;