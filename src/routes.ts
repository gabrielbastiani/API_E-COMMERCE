import { Router } from "express";
import multer from 'multer';
import uploadConfig from './config/multer';
import { checkRole } from "./middlewares/checkRole";
import { isAuthenticatedEcommerce } from "./middlewares/isAuthenticatedEcommerce";
import { body } from "express-validator/lib/middlewares/validation-chain-builders";

// --- USUARIOS E-COMMERCE --- //
import { UserEcommerceCreateController } from "./controllers/users/UserEcommerceCreateController";

// --- COLORS --- //
import { ThemeController } from "./controllers/configuration_ecommerce/theme_setting/ThemeController";

// --- TEMPLATES DE EMAILS
import EmailTemplateController from "./controllers/templates_emails/EmailTemplateController";
import { CreateConfigurationController } from "./controllers/configuration_ecommerce/theme_setting/CreateConfigurationController";





const router = Router();
const upload_image = multer(uploadConfig.upload("./images"));
const controller = new ThemeController();


// --- USUARIOS E-COMMERCE --- //
router.post('/user/ecommerce/create', upload_image.single('file'), new UserEcommerceCreateController().handle);

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