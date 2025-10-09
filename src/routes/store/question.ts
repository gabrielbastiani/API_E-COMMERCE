import { Router } from "express";
import { isAuthenticatedCustomer } from "../../middlewares/isAuthenticatedCustomer";
import { isAuthenticatedEcommerce } from "../../middlewares/isAuthenticatedEcommerce";

import { QuestionProductCreateController } from "../../controllers/product/question/QuestionProductCreateController";
import { QuestionProductUpdateController } from "../../controllers/product/question/QuestionProductUpdateController";
import { QuestionProductStatusApprovedController } from "../../controllers/product/question/QuestionProductStatusApprovedController";
import { QuestionProductCMSController } from "../../controllers/product/question/QuestionProductCMSController";
import { QuestionProductDeleteController } from "../../controllers/product/question/QuestionProductDeleteController";
import { ResponseQuestionProductCreateController } from "../../controllers/product/question/ResponseQuestionProductCreateController";

const router = Router();

router.post('/question/create', isAuthenticatedCustomer, (req, res) => new QuestionProductCreateController().handle(req, res));
router.post('/response/ecommerce/product', isAuthenticatedEcommerce, (req, res) => new ResponseQuestionProductCreateController().handle(req, res));
router.put('/question/update/status', isAuthenticatedEcommerce, (req, res) => new QuestionProductUpdateController().handle(req, res));
router.get('/question/statusApproved', (req, res) => new QuestionProductStatusApprovedController().handle(req, res));
router.get('/question/cms', isAuthenticatedEcommerce, (req, res) => new QuestionProductCMSController().handle(req, res));
router.delete('/question/delete', isAuthenticatedEcommerce, (req, res) => new QuestionProductDeleteController().handle(req, res));

export default router;