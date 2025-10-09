import { Router } from "express";
import { isAuthenticatedEcommerce } from "../../middlewares/isAuthenticatedEcommerce";
import { checkRole } from "../../middlewares/checkRole";

import { TemplatesEmailsController } from "../../controllers/templates_emails/TemplatesEmailsController";
import { GetTemplateContentController } from "../../controllers/templates_emails/GetTemplateContentController";
import { GetTemplateDataController } from "../../controllers/templates_emails/GetTemplateDataController";
import { UpdateTemplateContentController } from "../../controllers/templates_emails/UpdateTemplateContentController";
import { UpdateTemplateMetadataController } from "../../controllers/templates_emails/UpdateTemplateMetadataController";
import { RenderTemplateController } from "../../controllers/templates_emails/RenderTemplateController";
import { CreateTemplateController } from "../../controllers/templates_emails/CreateTemplateController";
import { DeleteTemplateController } from "../../controllers/templates_emails/DeleteTemplateController";

const router = Router();

router.post('/email-templates', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new CreateTemplateController().handle);
router.get('/all_templates/email-templates', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new TemplatesEmailsController().handle);
router.get('/template_email/content', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new GetTemplateContentController().handle);
router.get('/template_email/data', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new GetTemplateDataController().handle);
router.put('/template_email/update', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new UpdateTemplateContentController().handle);
router.put('/template_email/metadata', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new UpdateTemplateMetadataController().handle);
router.post('/template_email/render', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new RenderTemplateController().handle);
router.delete('/email-templates/delete', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new DeleteTemplateController().handle);

export default router;