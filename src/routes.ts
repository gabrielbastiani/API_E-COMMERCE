import { Router } from "express";
import multer from 'multer';
import uploadConfig from './config/multer';
import { checkRole } from "./middlewares/checkRole";
import { isAuthenticatedEcommerce } from "./middlewares/isAuthenticatedEcommerce";
import { body } from "express-validator/lib/middlewares/validation-chain-builders";

// --- USUARIOS E-COMMERCE --- //
import { UserEcommerceCreateController } from "./controllers/users/UserEcommerceCreateController";
import { SuperUserPublicController } from "./controllers/users/SuperUserPublicController";
import { UserAuthController } from "./controllers/users/UserAuthController";
import { UserUpdateDataController } from "./controllers/users/UserUpdateDataController";
import { UserPhotoDeleteController } from "./controllers/users/UserPhotoDeleteController";
import { UserDeleteController } from "./controllers/users/UserDeleteController";
import { PasswordRecoveryUserController } from "./controllers/users/PasswordRecoveryUserController";

// --- COLORS --- //
import { ThemeController } from "./controllers/configuration_ecommerce/theme_setting/ThemeController";

// --- CONFIGURAÇÔES DO ECOMMERCE --- //
import { CreateConfigurationController } from "./controllers/configuration_ecommerce/theme_setting/CreateConfigurationController";

// --- TEMPLATES DE EMAILS
import EmailTemplateController from "./controllers/templates_emails/EmailTemplateController";import { UserDetailController } from "./controllers/users/UserDetailController";
import { RequestPasswordUserRecoveryController } from "./controllers/users/RequestPasswordUserRecoveryController";






const router = Router();
const upload_image = multer(uploadConfig.upload("./images"));
const controller = new ThemeController();


// --- USUARIOS E-COMMERCE --- //
router.post('/user/ecommerce/create', upload_image.single('file'), new UserEcommerceCreateController().handle);
router.post('/user/ecommerce/session', new UserAuthController().handle);
router.get('/user/me', isAuthenticatedEcommerce, new UserDetailController().handle);
router.put('/user/ecommerce/update', isAuthenticatedEcommerce, upload_image.single('file'), new UserUpdateDataController().handle);
router.get('/user/ecommerce/publicSuper_user', new SuperUserPublicController().handle);
router.put('/user/ecommerce/delete_photo', isAuthenticatedEcommerce, new UserPhotoDeleteController().handle);
router.delete('/user/ecommerce/delete_user', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new UserDeleteController().handle);
router.put('/user/ecommerce/recovery_password', new PasswordRecoveryUserController().handle);
router.post('/user/email_recovery_password', new RequestPasswordUserRecoveryController().handle);

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