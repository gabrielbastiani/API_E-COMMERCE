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

// --- NOTIFICATIONS --- //
import { FindNotificationController } from "./controllers/notification/notification_userEcommerce/FindNotificationController";
import { MarkNotificationReadController } from "./controllers/notification/notification_userEcommerce/MarkNotificationReadController";
import { MarkAllNotificationsAsReadController } from "./controllers/notification/notification_userEcommerce/MarkAllNotificationsAsReadController";
import { FindUsersNotificationController } from "./controllers/notification/notification_userEcommerce/FindUsersNotificationController";
import { NotificationDeleteController } from "./controllers/notification/notification_userEcommerce/NotificationDeleteController";

// --- CUSTOMERS --- //
import { CustomerUpdateDataController } from "./controllers/users/customers/CustomerUpdateDataController";
import { CustomerPhotoDeleteController } from "./controllers/users/customers/CustomerPhotoDeleteController";
import { CustomerDetailController } from "./controllers/users/customers/CustomerDetailController";
import { CustomerDeleteController } from "./controllers/users/customers/CustomerDeleteController";
import { CustomerCreateController } from "./controllers/users/customers/CustomerCreateController";
import { CustomerAuthController } from "./controllers/users/customers/CustomerAuthController";
import { RequestPasswordCustomerRecoveryController } from "./controllers/users/customers/RequestPasswordCustomerRecoveryController";
import { PasswordRecoveryCustomerController } from "./controllers/users/customers/PasswordRecoveryCustomerController";
import { GenerateExcelDeleteCustomerController } from "./controllers/users/customers/GenerateExcelDeleteCustomerController";
import { BulkDeleteCustomerController } from "./controllers/users/customers/BulkDeleteCustomerController";
import { AllCustomerController } from "./controllers/users/customers/AllCustomerController";

// --- COLORS --- //
import { ThemeController } from "./controllers/configuration_ecommerce/theme_setting/ThemeController";

// --- CONFIGURAÇÔES DO ECOMMERCE --- //
import { CreateConfigurationController } from "./controllers/configuration_ecommerce/theme_setting/CreateConfigurationController";

// --- TEMPLATES DE EMAILS
import EmailTemplateController from "./controllers/templates_emails/EmailTemplateController"; import { UserDetailController } from "./controllers/users/users_ecommerce/UserDetailController";

// --- MARKETING PUBLICAÇÔES --- //
import { UpdateViewsPuplicationsController } from "./controllers/marketing_publication/UpdateViewsPuplicationsController";
import { MarketingPublicationController } from "./controllers/marketing_publication/MarketingPublicationController";
import { MarketingUpdateDataController } from "./controllers/marketing_publication/MarketingUpdateDataController";
import { MarketingPublicationDeleteDeleteController } from "./controllers/marketing_publication/MarketingPublicationDeleteDeleteController";
import { MarketingDeleteImageController } from "./controllers/marketing_publication/MarketingDeleteImageController";
import { IntervalUpdateDataController } from "./controllers/marketing_publication/IntervalUpdateDataController";
import { IntervalBannerController } from "./controllers/marketing_publication/IntervalBannerController";
import { IntervalBannerPageController } from "./controllers/marketing_publication/IntervalBannerPageController";
import { GenerateExcelDeletePublicationController } from "./controllers/marketing_publication/GenerateExcelDeletePublicationController";
import { ExistingPublicationPageController } from "./controllers/marketing_publication/ExistingPublicationPageController";
import { ExistingIntervalBannerController } from "./controllers/marketing_publication/ExistingIntervalBannerController";
import { DeleteIntervalBannerController } from "./controllers/marketing_publication/DeleteIntervalBannerController";
import { CreateMarketingPublicationController } from "./controllers/marketing_publication/CreateMarketingPublicationController";
import { BulkDeleteMarketingPublicationController } from "./controllers/marketing_publication/BulkDeleteMarketingPublicationController";
import { AllMarketingPublicationController } from "./controllers/marketing_publication/AllMarketingPublicationController";

// --- NEWSLETTER --- //
import { NewsletterCreateController } from "./controllers/newsletter/NewsletterCreateController";
import { NewsletterDeleteController } from "./controllers/newsletter/NewsletterDeleteController";
import { NewsletterFindController } from "./controllers/newsletter/NewsletterFindController";

// --- FORMULARIO CONTATO --- //
import { FormContactCreateController } from "./controllers/form_contact/FormContactCreateController";
import { FormContactDeleteController } from "./controllers/form_contact/FormContactDeleteController";
import { FormContactFindController } from "./controllers/form_contact/FormContactFindController";
import { ContactController } from "./controllers/form_contact/ContactController";
import { UpdateConfigurationEcommerceController } from "./controllers/configuration_ecommerce/UpdateConfigurationEcommerceController";
import { GetConfigurationsEcommerceController } from "./controllers/configuration_ecommerce/GetConfigurationsEcommerceController";



const router = Router();
const upload_image = multer(uploadConfig.upload("./images"));
const temp_file = multer(uploadConfig.upload("./temp_file"));
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

// --- NOTIFICATIONS --- //
router.get('/user/userEcommerce/notifications', isAuthenticatedEcommerce, new FindNotificationController().handle);
router.put('/user/notifications/userEcommerce/mark-read', isAuthenticatedEcommerce, new MarkNotificationReadController().handle);
router.put('/user/notifications/userEcommerce/mark-all-read', isAuthenticatedEcommerce, new MarkAllNotificationsAsReadController().handle);
router.get('/user/notifications/userEcommerce/central_notifications', isAuthenticatedEcommerce, new FindUsersNotificationController().handle);
router.delete('/user/notifications/userEcommerce/delete_notification', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new NotificationDeleteController().handle);

// --- CUSTOMERS --- //
router.post('/user/customer/create', upload_image.single('file'), new CustomerCreateController().handle);
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
router.put('/configuration_ecommerce/update', isAuthenticatedEcommerce, checkRole(['SUPER_ADMIN']), upload_image.fields([{ name: 'logo', maxCount: 1 }, { name: 'favicon', maxCount: 1 }]), new UpdateConfigurationEcommerceController().handle);
router.get('/configuration_ecommerce/get_configs', new GetConfigurationsEcommerceController().handle);

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

// --- MARKETING PUBLICAÇÔES --- //
router.post('/marketing_publication/create', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), upload_image.single('file'), new CreateMarketingPublicationController().handle);
router.patch('/marketing_publication/:marketingPublication_id/clicks', new UpdateViewsPuplicationsController().handle);
router.get('/marketing_publication/store_publications/slides', new MarketingPublicationController().handle);
router.put('/marketing_publication/update', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), upload_image.single('file'), new MarketingUpdateDataController().handle);
router.delete('/marketing_publication/delete_publications', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new MarketingPublicationDeleteDeleteController().handle);
router.put('/marketing_publication/delete_publications/delete_image', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new MarketingDeleteImageController().handle);
router.put('/marketing_publication/interval_banner/update_data', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new IntervalUpdateDataController().handle);
router.post('/marketing_publication/interval_banner', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new IntervalBannerController().handle);
router.get('/marketing_publication/interval_banner/page_banner', new IntervalBannerPageController().handle);
router.get('/marketing_publication/download_excel_delete_marketing', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new GenerateExcelDeletePublicationController().handle);
router.get('/marketing_publication/existing_publication', new ExistingPublicationPageController().handle);
router.get('/marketing_publication/interval_banner/existing_interval', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new ExistingIntervalBannerController().handle);
router.delete('/marketing_publication/delete', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new DeleteIntervalBannerController().handle);
router.post('/marketing_publication/bulk_delete_publications', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), temp_file.single('file'), new BulkDeleteMarketingPublicationController().handle);
router.get('/marketing_publication/all_publications', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new AllMarketingPublicationController().handle);

// --- NEWSLETTER --- //
router.post('/newsletter/create_newsletter', new NewsletterCreateController().handle);
router.delete('/newsletter/delete_newsletter', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new NewsletterDeleteController().handle);
router.get('/newsletter/get_newsletters', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new NewsletterFindController().handle);

// --- FORMULARIO CONTATO --- //
router.post('/form_contact/create_form_contact', new FormContactCreateController().handle);
router.delete('/form_contact/delete_form_contatct', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new FormContactDeleteController().handle);
router.get('/contacts_form/all_contacts', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new FormContactFindController().handle);
router.get('/contacts_form/contact', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new ContactController().handle);


export { router };