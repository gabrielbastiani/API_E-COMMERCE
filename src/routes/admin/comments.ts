import { Router } from "express";
import { isAuthenticatedEcommerce } from "../../middlewares/isAuthenticatedEcommerce";
import { uploadCommentFiles } from "../../middlewares/uploadCommentFiles";
import { adminGetOrderComments, adminPostOrderComment } from "../../controllers/users/users_ecommerce/commentOrderAdmin.controller";

const router = Router();

router.get("/admin/orders/:orderId/comments", isAuthenticatedEcommerce, adminGetOrderComments);
router.post("/admin/orders/:orderId/comments", isAuthenticatedEcommerce, uploadCommentFiles.array("files", 5), adminPostOrderComment);

export default router;