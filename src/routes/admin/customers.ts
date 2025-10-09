import { Router } from "express";
import multer from "multer";
import uploadConfig from "../../config/multer";
import { isAuthenticatedCustomer } from "../../middlewares/isAuthenticatedCustomer";
import { isAuthenticatedEcommerce } from "../../middlewares/isAuthenticatedEcommerce";
import { checkRole } from "../../middlewares/checkRole";

import { CustomerUpdateDataController } from "../../controllers/users/customers/CustomerUpdateDataController";
import { CustomerPhotoDeleteController } from "../../controllers/users/customers/CustomerPhotoDeleteController";
import { CustomerDetailController } from "../../controllers/users/customers/CustomerDetailController";
import { CustomerDeleteController } from "../../controllers/users/customers/CustomerDeleteController";
import { CustomerCreateController } from "../../controllers/users/customers/CustomerCreateController";
import { CustomerAuthController } from "../../controllers/users/customers/CustomerAuthController";
import { RequestPasswordCustomerRecoveryController } from "../../controllers/users/customers/RequestPasswordCustomerRecoveryController";
import { PasswordRecoveryCustomerController } from "../../controllers/users/customers/PasswordRecoveryCustomerController";
import { GenerateExcelDeleteCustomerController } from "../../controllers/users/customers/GenerateExcelDeleteCustomerController";
import { BulkDeleteCustomerController } from "../../controllers/users/customers/BulkDeleteCustomerController";
import { AllCustomerController } from "../../controllers/users/customers/AllCustomerController";

const router = Router();
const upload_image = multer(uploadConfig.upload("./images"));
const temp_file = multer(uploadConfig.upload("./temp_file"));

router.post('/user/customer/create', new CustomerCreateController().handle);
router.post('/user/customer/session', new CustomerAuthController().handle);
router.put('/user/customer/update', isAuthenticatedCustomer, upload_image.single('file'), new CustomerUpdateDataController().handle);
router.put('/user/customer/delete_photo', isAuthenticatedCustomer, new CustomerPhotoDeleteController().handle);
router.get('/user/customer/me', isAuthenticatedCustomer, new CustomerDetailController().handle);
router.delete('/user/customer/delete_user_customer', isAuthenticatedCustomer, checkRole(['ADMIN', 'SUPER_ADMIN']), new CustomerDeleteController().handle);
router.post('/user/customer/email_recovery_password_customer', new RequestPasswordCustomerRecoveryController().handle);
router.put('/user/customer/recovery_password_customer', new PasswordRecoveryCustomerController().handle);
router.get('/user/customer/download_excel_delete_customer', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new GenerateExcelDeleteCustomerController().handle);
router.post('/user/customer/bulk_delete_customer', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), temp_file.single('file'), new BulkDeleteCustomerController().handle);
router.get('/user/customer/all_users_customer', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new AllCustomerController().handle);

export default router;