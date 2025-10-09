import { Router } from "express";
import { isAuthenticatedCustomer } from "../../middlewares/isAuthenticatedCustomer";
import { uploadCommentFiles } from "../../middlewares/uploadCommentFiles";
import { getOrderComments, postOrderComment } from "../../controllers/users/customers/orders/commentOrder.controller";

const router = Router();

router.get("/customer/orders/:orderId/comments", isAuthenticatedCustomer, getOrderComments);
router.post("/customer/orders/:orderId/comments", isAuthenticatedCustomer, uploadCommentFiles.array("files", 5), postOrderComment);

export default router;