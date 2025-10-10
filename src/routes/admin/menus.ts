import { Router } from "express";
import multer from "multer";
import uploadConfig from "../../config/multer";
import { isAuthenticatedEcommerce } from "../../middlewares/isAuthenticatedEcommerce";
import { checkRole } from "../../middlewares/checkRole";

import { CreateMenuController } from "../../controllers/menus/CreateMenuController";
import { ListMenusController } from "../../controllers/menus/ListMenusController";
import { UpdateMenuController } from "../../controllers/menus/UpdateMenuController";
import { DeleteMenuController } from "../../controllers/menus/DeleteMenuController";
import { CreateMenuItemController } from "../../controllers/menus/menuItems/CreateMenuItemController";
import { ListMenuItemsController } from "../../controllers/menus/menuItems/ListMenuItemsController";
import { UpdateMenuItemController } from "../../controllers/menus/menuItems/UpdateMenuItemController";
import { DeleteMenuItemController } from "../../controllers/menus/menuItems/DeleteMenuItemController";
import { StatusMenuController } from "../../controllers/menus/StatusMenuController";
import { MenuCmsController } from "../../controllers/menus/MenuCmsController";
import { GetUniqueMenuController } from "../../controllers/menus/GetUniqueMenuController";
import { MenuGetForStoreController } from "../../controllers/menus/MenuGetForStoreController";
import { ItemMenuImageDeleteController } from "../../controllers/menus/menuItems/ItemMenuImageDeleteController";
import { MenuImageDeleteController } from "../../controllers/menus/MenuImageDeleteController";

const router = Router();
const upload_image_menu = multer(uploadConfig.upload("./images/menu"));

const ctrlMenu = new MenuGetForStoreController();

router.post("/menu/create", isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), upload_image_menu.single('file'), new CreateMenuController().handle);
router.get("/menu/get", isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), new ListMenusController().handle);
router.put("/menu/getUnique/:id", isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), upload_image_menu.single('file'), new UpdateMenuController().handle);
router.delete("/menu/delete", isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), new DeleteMenuController().handle);
router.delete('/menu/icon/delete', isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), new MenuImageDeleteController().handle);
router.post("/menuItem/create", isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), upload_image_menu.single("file"),
    (req, res, next) => new CreateMenuItemController().handle(req, res).catch(next)
);
router.delete('/menuItem/icon/delete', isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), new ItemMenuImageDeleteController().handle);
router.get("/menuItem/get", isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), new ListMenuItemsController().handle);
router.put("/menuItem/getUnique/:id", isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), upload_image_menu.single("file"),
    (req, res, next) => new UpdateMenuItemController().handle(req, res).catch(next)
);
router.delete("/menuItem/get/delete/:id", isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), new DeleteMenuItemController().handle);
router.put('/menu/status', isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), new StatusMenuController().handle);
router.get('/menu/cms', isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), new MenuCmsController().handle);
router.get('/menus/get/data', isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), new GetUniqueMenuController().handle);

// store menu endpoint
router.get("/menu/get/store", ctrlMenu.getMenu.bind(ctrlMenu));

export default router;