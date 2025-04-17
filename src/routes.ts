import { Router } from "express";
import multer from 'multer';
import uploadConfig from './config/multer';
import { checkRole } from "./middlewares/checkRole";
import { isAuthenticatedEcommerce } from "./middlewares/isAuthenticatedEcommerce";
import { isAuthenticatedCustomer } from "./middlewares/isAuthenticatedCustomer";
import { body } from "express-validator/lib/middlewares/validation-chain-builders";

// --- USUARIOS E-COMMERCE --- //
import { UserCreateController } from "./controllers/users/users_ecommerce/UserCreateController";
import { SuperUserPublicController } from "./controllers/users/users_ecommerce/SuperUserPublicController";
import { UserAuthController } from "./controllers/users/users_ecommerce/UserAuthController";
import { UserUpdateDataController } from "./controllers/users/users_ecommerce/UserUpdateDataController";
import { UserPhotoDeleteController } from "./controllers/users/users_ecommerce/UserPhotoDeleteController";
import { UserDeleteController } from "./controllers/users/users_ecommerce/UserDeleteController";
import { PasswordRecoveryUserController } from "./controllers/users/users_ecommerce/PasswordRecoveryUserController";
import { RequestPasswordUserRecoveryController } from "./controllers/users/users_ecommerce/RequestPasswordUserRecoveryController";
import { GenerateExcelController } from "./controllers/users/users_ecommerce/GenerateExcelController";
import { AllUserController } from "./controllers/users/users_ecommerce/AllUserController";

// --- CUSTOMERS --- //
import { CustomerUpdateDataController } from "./controllers/users/customers/CustomerUpdateDataController";
import { CustomerPhotoDeleteController } from "./controllers/users/customers/CustomerPhotoDeleteController";
import { CustomerDetailController } from "./controllers/users/customers/CustomerDetailController";
import { CustomerDeleteController } from "./controllers/users/customers/CustomerDeleteController";

// --- COLORS --- //
import { ThemeController } from "./controllers/configuration_ecommerce/theme_setting/ThemeController";

// --- CONFIGURAÇÔES DO ECOMMERCE --- //
import { CreateConfigurationController } from "./controllers/configuration_ecommerce/theme_setting/CreateConfigurationController";

// --- TEMPLATES DE EMAILS
import EmailTemplateController from "./controllers/templates_emails/EmailTemplateController"; import { UserDetailController } from "./controllers/users/users_ecommerce/UserDetailController";
import { CustomerCreateController } from "./controllers/users/customers/CustomerCreateController";





const router = Router();
const upload_image = multer(uploadConfig.upload("./images"));
const controller = new ThemeController();

// --- USUARIOS E-COMMERCE --- //
router.post('/user/ecommerce/create', upload_image.single('file'), new UserCreateController().handle);
router.post('/user/ecommerce/session', new UserAuthController().handle);
router.get('/user/ecommerce/me', isAuthenticatedEcommerce, new UserDetailController().handle);
router.put('/user/ecommerce/update', isAuthenticatedEcommerce, upload_image.single('file'), new UserUpdateDataController().handle);
router.get('/user/ecommerce/publicSuper_user', new SuperUserPublicController().handle);
router.put('/user/ecommerce/delete_photo', isAuthenticatedEcommerce, new UserPhotoDeleteController().handle);
router.delete('/user/ecommerce/delete_user', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new UserDeleteController().handle);
router.put('/user/ecommerce/recovery_password', new PasswordRecoveryUserController().handle);
router.post('/user/ecommerce/email_recovery_password', new RequestPasswordUserRecoveryController().handle);
router.get('/user/ecommerce/download_excel', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new GenerateExcelController().handle);
router.get('/user/ecommerce/all_users', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new AllUserController().handle);

// --- CUSTOMERS --- //
router.post('/user/customer/create', upload_image.single('file'), new CustomerCreateController().handle);
router.put('/user/customer/update', isAuthenticatedCustomer, upload_image.single('file'), new CustomerUpdateDataController().handle);
router.put('/user/customer/delete_photo', isAuthenticatedCustomer, new CustomerPhotoDeleteController().handle);
router.get('/user/customer/me', isAuthenticatedCustomer, new CustomerDetailController().handle);
router.delete('/user/customer/delete_user_customer', isAuthenticatedCustomer, checkRole(['ADMIN', 'SUPER_ADMIN']), new CustomerDeleteController().handle);

// -- COLORS --
router.get('/theme', controller.getTheme);
router.put(
    '/theme',
    isAuthenticatedEcommerce,
    checkRole(['SUPER_ADMIN']),
    [
        body('colors')
            .isObject()
            .custom(value => {
                for (const color of Object.values(value)) {
                    if (!/^#([0-9A-F]{3}){1,2}$/i.test(color as string)) {
                        throw new Error('Cores devem ser hexadecimais');
                    }
                }
                return true;
            })
    ],
    controller.updateTheme
);

// --- CONFIGURAÇÔES DO ECOMMERCE --- //
router.post('/create/ecommerce', upload_image.fields([{ name: 'logo', maxCount: 1 }, { name: 'favicon', maxCount: 1 }]), new CreateConfigurationController().handle);

// --- TEMPLATES DE EMAILS --- //
// Rota para listar todos os templates
router.get('/email-templates', EmailTemplateController.getAll);
// Rota para obter um template por ID
router.get('/email-templates/:id', EmailTemplateController.getById);
// Rota para criar um novo template
router.post('/email-templates', EmailTemplateController.create);
// Rota para atualizar um template existente
router.put('/email-templates/:id', EmailTemplateController.update);
// Rota para excluir um template
router.delete('/email-templates/:id', EmailTemplateController.delete);
// Rota para renderizar um template (útil para previews/testes de renderização)
router.post('/email-templates/:id/render', EmailTemplateController.renderById);
router.post('/email-templates/render/:templateName', EmailTemplateController.renderByName);

export { router };