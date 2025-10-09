import { Router } from "express";
import { MenuGetForStoreController } from "../../controllers/menus/MenuGetForStoreController";
const ctrlMenu = new MenuGetForStoreController();

const router = Router();

router.get("/menu/get/store", ctrlMenu.getMenu.bind(ctrlMenu));

export default router;