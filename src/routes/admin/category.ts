import { Router } from "express";
import multer from "multer";
import uploadConfig from "../../config/multer";
import { isAuthenticatedEcommerce } from "../../middlewares/isAuthenticatedEcommerce";
import { checkRole } from "../../middlewares/checkRole";

import { CategoriesController } from "../../controllers/category/CategoriesController";
import { CategoryCreateController } from "../../controllers/category/CategoryCreateController";
import { CategoryUpdateOrderController } from "../../controllers/category/CategoryUpdateOrderController";
import { BulkCategoryImportController } from "../../controllers/category/BulkCategoryImportController";
import { GenerateExcelCategoryController } from "../../controllers/category/GenerateExcelCategoryController";
import { AllCategoriesController } from "../../controllers/category/AllCategoriesController";
import { CategoryUpdateDataController } from "../../controllers/category/CategoryUpdateDataController";
import { CategoryDeleteController } from "../../controllers/category/CategoryDeleteController";
import { CategoryDeleteImageController } from "../../controllers/category/CategoryDeleteImageController";
import { AllProductsCategoryController } from "../../controllers/category/AllProductsCategoryController";
import { CategoriesStoreHomeController } from "../../controllers/category/CategoriesStoreHomeController";
import { listProductsByCategory, listFiltersByCategory } from "../../controllers/product/categoryProduct/category.controller";

const router = Router();
const upload_image_category = multer(uploadConfig.upload("./images/category"));
const temp_file = multer(uploadConfig.upload("./temp_file"));

router.post('/category/create', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), upload_image_category.single('file'), new CategoryCreateController().handle);
router.get('/category/cms', isAuthenticatedEcommerce, new CategoriesController().handle);
router.put('/category/updateOrder', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new CategoryUpdateOrderController().handle);
router.post('/category/bulk_categories', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), temp_file.single("file"), new BulkCategoryImportController().handle);
router.get('/category/donwload_excel_categories', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new GenerateExcelCategoryController().handle);
router.get('/category/cms/all_categories', isAuthenticatedEcommerce, new AllCategoriesController().handle);
router.put('/category/update', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), upload_image_category.single('file'), new CategoryUpdateDataController().handle);
router.delete('/category/delete_category', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new CategoryDeleteController().handle);
router.put('/category/delete_image', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new CategoryDeleteImageController().handle);
router.get('/category/products', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new AllProductsCategoryController().handle);

// store-facing category endpoints (kept here for parity)
router.get('/categories/store/grid', new CategoriesStoreHomeController().handle);
router.get('/category/name', new (require('../../controllers/category/CategoryPageController').CategoryPageController)().handle);
router.get('/categories/:slug/products', listProductsByCategory);
router.get('/categories/:slug/filters', listFiltersByCategory);

export default router;