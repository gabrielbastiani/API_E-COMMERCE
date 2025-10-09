import { Router } from "express";
import { CreateFavoriteController } from "../../controllers/favorite/CreateFavoriteController";
import { DeleteFavoriteController } from "../../controllers/favorite/DeleteFavoriteController";
import { GetFavoriteCustomerController } from "../../controllers/favorite/GetFavoriteCustomerController";
import productsController from "../../controllers/favorite/products.controller";

const router = Router();

router.post('/favorite/create', (req, res) => new CreateFavoriteController().handle(req, res));
router.delete('/favorite/delete', (req, res) => new DeleteFavoriteController().handle(req, res));
router.get('/favorite/customer/pageProduct', (req, res) => new GetFavoriteCustomerController().handle(req, res));
router.get("/productsFavorites", (req, res) => productsController.getProducts(req, res));
router.get("/productsById/favoritesPage/:id", (req, res) => productsController.getProductById(req, res));

export default router;