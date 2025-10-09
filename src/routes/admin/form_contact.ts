import { Router } from "express";
import { isAuthenticatedEcommerce } from "../../middlewares/isAuthenticatedEcommerce";
import { checkRole } from "../../middlewares/checkRole";

import { FormContactCreateController } from "../../controllers/form_contact/FormContactCreateController";
import { FormContactDeleteController } from "../../controllers/form_contact/FormContactDeleteController";
import { FormContactFindController } from "../../controllers/form_contact/FormContactFindController";
import { ContactController } from "../../controllers/form_contact/ContactController";

const router = Router();

router.post('/form_contact/create_form_contact', new FormContactCreateController().handle);
router.delete('/form_contact/delete_form_contatct', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new FormContactDeleteController().handle);
router.get('/contacts_form/all_contacts', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new FormContactFindController().handle);
router.get('/contacts_form/contact', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new ContactController().handle);

export default router;