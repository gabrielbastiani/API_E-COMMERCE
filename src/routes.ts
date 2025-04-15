import { Router } from "express";
import multer from 'multer';
import uploadConfig from './config/multer';
import { checkRole } from "./middlewares/checkRole";
import { isAuthenticatedEcommerce } from "./middlewares/isAuthenticatedEcommerce";


// --- COLORS --- //
import { ThemeController } from "./controllers/configuration_blog/theme_setting/ThemeController";

// --- TEMPLATES DE EMAILS
import EmailTemplateController from "./controllers/templates_emails/EmailTemplateController";

// --- USUARIOS E-COMMERCE --- //
import { UserEcommerceCreateController } from "./controllers/users/UserEcommerceCreateController";




const router = Router();
const upload_image = multer(uploadConfig.upload("./images"));
const controller = new ThemeController();


// --- USUARIOS E-COMMERCE --- //
router.post('/user/ecommerce/create', upload_image.single('file'), new UserEcommerceCreateController().handle);

// -- ROUTES THEME SETTINGS --
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
router.post('/email-templates/:id/render', EmailTemplateController.render);

export { router };