import { Router } from "express";
import { isAuthenticatedEcommerce } from "../../middlewares/isAuthenticatedEcommerce";
import { checkRole } from "../../middlewares/checkRole";
import { NewsletterCreateController } from "../../controllers/newsletter/NewsletterCreateController";
import { NewsletterDeleteController } from "../../controllers/newsletter/NewsletterDeleteController";
import { NewsletterFindController } from "../../controllers/newsletter/NewsletterFindController";

const router = Router();

router.post('/newsletter/create_newsletter', new NewsletterCreateController().handle);
router.delete('/newsletter/delete_newsletter', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new NewsletterDeleteController().handle);
router.get('/newsletter/get_newsletters', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new NewsletterFindController().handle);

export default router;