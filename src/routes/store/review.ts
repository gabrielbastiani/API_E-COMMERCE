import { Router } from "express";
import { isAuthenticatedCustomer } from "../../middlewares/isAuthenticatedCustomer";
import { CreateReviewController } from "../../controllers/review/CreateReviewController";
import { getPaginatedReviews, getReviewSummary } from "../../controllers/review/ReviewController";

const router = Router();

router.post('/review/create', isAuthenticatedCustomer, (req, res) => new CreateReviewController().handle(req, res));
router.get('/review', (req, res) => getReviewSummary(req, res));
router.get('/review/pagination', (req, res) => getPaginatedReviews(req, res));

export default router;