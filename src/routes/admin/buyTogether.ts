import { Router } from "express";
import { isAuthenticatedEcommerce } from "../../middlewares/isAuthenticatedEcommerce";
import { checkRole } from "../../middlewares/checkRole";

import { GetBuyTogetherController } from "../../controllers/buyTogether/GetBuyTogetherController";
import { CreateBuyTogetherController } from "../../controllers/buyTogether/CreateBuyTogetherController";
import { ListBuyTogetherController } from "../../controllers/buyTogether/ListBuyTogetherController";
import { UpdateBuyTogetherController } from "../../controllers/buyTogether/UpdateBuyTogetherController";
import { StatusBuyTogetherController } from "../../controllers/buyTogether/StatusBuyTogetherController";
import { DeleteBuyTogetherController } from "../../controllers/buyTogether/DeleteBuyTogetherController";
import { FindUniqueBuyTogetherController } from "../../controllers/buyTogether/FindUniqueBuyTogetherController";

const router = Router();

router.get('/buy_together/get', isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), new GetBuyTogetherController().handle);
router.post('/buy_together/create', isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), new CreateBuyTogetherController().handle);
router.get("/buy_together", isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), new ListBuyTogetherController().handle);
router.put("/buy_together/:id", isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), new UpdateBuyTogetherController().handle);
router.put('/buyTogether/status', isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), new StatusBuyTogetherController().handle);
router.delete('/buyTogether/delete', isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), new DeleteBuyTogetherController().handle);
router.get('/buy_together/:id', isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), new FindUniqueBuyTogetherController().handle);

export default router;