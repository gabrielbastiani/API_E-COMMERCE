import { Router } from "express";
import { CategoriesStoreHomeController } from "../../controllers/category/CategoriesStoreHomeController";
import { CategoryPageController } from "../../controllers/category/CategoryPageController";
import { listProductsByCategory, listFiltersByCategory } from "../../controllers/product/categoryProduct/category.controller";

const router = Router();

router.get('/categories/store/grid', (req, res) => new CategoriesStoreHomeController().handle(req, res));
router.get('/category/name', (req, res) => new CategoryPageController().handle(req, res));
router.get('/categories/:slug/products', listProductsByCategory);
router.get('/categories/:slug/filters', listFiltersByCategory);

export default router;