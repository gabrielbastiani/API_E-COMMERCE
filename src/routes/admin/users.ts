import { Router } from "express";
import multer from "multer";
import uploadConfig from "../../config/multer";
import { checkRole } from "../../middlewares/checkRole";
import { isAuthenticatedEcommerce } from "../../middlewares/isAuthenticatedEcommerce";

// controllers
import { UserCreateController } from "../../controllers/users/users_ecommerce/UserCreateController";
import { SuperUserPublicController } from "../../controllers/users/users_ecommerce/SuperUserPublicController";
import { UserAuthController } from "../../controllers/users/users_ecommerce/UserAuthController";
import { UserUpdateDataController } from "../../controllers/users/users_ecommerce/UserUpdateDataController";
import { UserPhotoDeleteController } from "../../controllers/users/users_ecommerce/UserPhotoDeleteController";
import { UserDeleteController } from "../../controllers/users/users_ecommerce/UserDeleteController";
import { PasswordRecoveryUserController } from "../../controllers/users/users_ecommerce/PasswordRecoveryUserController";
import { RequestPasswordUserRecoveryController } from "../../controllers/users/users_ecommerce/RequestPasswordUserRecoveryController";
import { GenerateExcelController } from "../../controllers/users/users_ecommerce/GenerateExcelController";
import { AllUserController } from "../../controllers/users/users_ecommerce/AllUserController";
import { UserDetailController } from "../../controllers/users/users_ecommerce/UserDetailController";

const router = Router();
const upload_image_userEcommerce = multer(uploadConfig.upload("./images/userEcommerce"));

router.post('/user/ecommerce/create', upload_image_userEcommerce.single('file'), new UserCreateController().handle);
router.post('/user/ecommerce/session', new UserAuthController().handle);
router.get('/user/ecommerce/me', isAuthenticatedEcommerce, new UserDetailController().handle);
router.put('/user/ecommerce/update', isAuthenticatedEcommerce, upload_image_userEcommerce.single('file'), new UserUpdateDataController().handle);
router.get('/user/ecommerce/publicSuper_user', new SuperUserPublicController().handle);
router.put('/user/ecommerce/delete_photo', isAuthenticatedEcommerce, new UserPhotoDeleteController().handle);
router.delete('/user/ecommerce/delete_user', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new UserDeleteController().handle);
router.put('/user/ecommerce/recovery_password', new PasswordRecoveryUserController().handle);
router.post('/user/ecommerce/email_recovery_password', new RequestPasswordUserRecoveryController().handle);
router.get('/user/ecommerce/download_excel', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new GenerateExcelController().handle);
router.get('/user/ecommerce/all_users', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new AllUserController().handle);

export default router;