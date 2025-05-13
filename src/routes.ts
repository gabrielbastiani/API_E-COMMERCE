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
import { UserDetailController } from "./controllers/users/users_ecommerce/UserDetailController";

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
import { ColorsController } from "./controllers/configuration_ecommerce/colors_setting/ColorsController";

// --- CONFIGURAÇÔES DO ECOMMERCE --- //
import { CreateConfigurationController } from "./controllers/configuration_ecommerce/CreateConfigurationController";
import { DeleteFilesExcelController } from "./controllers/configuration_ecommerce/DeleteFilesExcelController";

// --- TEMPLATES DE EMAILS
import { TemplatesEmailsController } from "./controllers/templates_emails/TemplatesEmailsController";
import { GetTemplateContentController } from "./controllers/templates_emails/GetTemplateContentController";
import { GetTemplateDataController } from "./controllers/templates_emails/GetTemplateDataController";
import { UpdateTemplateContentController } from "./controllers/templates_emails/UpdateTemplateContentController";
import { UpdateTemplateMetadataController } from "./controllers/templates_emails/UpdateTemplateMetadataController";
import { RenderTemplateController } from "./controllers/templates_emails/RenderTemplateController";
import { CreateTemplateController } from "./controllers/templates_emails/CreateTemplateController";
import { DeleteTemplateController } from "./controllers/templates_emails/DeleteTemplateController";

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

// --- SEO --- //
import { CreateSeoEcommerceController } from "./controllers/configuration_ecommerce/seo/CreateSeoEcommerceController";
import { UpdateSeoSettingsController } from "./controllers/configuration_ecommerce/seo/UpdateSeoSettingsController";
import { GetSeoUniqueController } from "./controllers/configuration_ecommerce/seo/GetSeoUniqueController";
import { DeleteKeywordController } from "./controllers/configuration_ecommerce/seo/DeleteKeywordController";
import { AddKeywordController } from "./controllers/configuration_ecommerce/seo/AddKeywordController";
import { AddOgImagesController } from "./controllers/configuration_ecommerce/seo/AddOgImagesController";
import { DeleteOgImageController } from "./controllers/configuration_ecommerce/seo/DeleteOgImageController";
import { AddTwitterImagesController } from "./controllers/configuration_ecommerce/seo/AddTwitterImagesController";
import { DeleteTwitterImageController } from "./controllers/configuration_ecommerce/seo/DeleteTwitterImageController";
import { AllSeoEcommercePageController } from "./controllers/configuration_ecommerce/seo/AllSeoEcommercePageController";

// --- MEDIA SOCIAL --- //
import { CreateMediaSocialEcommerceController } from "./controllers/configuration_ecommerce/media_social/CreateMediaSocialEcommerceController";
import { DeleteMediasSocialsEcommerceController } from "./controllers/configuration_ecommerce/media_social/DeleteMediasSocialsEcommerceController";
import { MediasSocialsEcommerceController } from "./controllers/configuration_ecommerce/media_social/MediasSocialsEcommerceController";
import { UpdateMediaSocialEcommerceController } from "./controllers/configuration_ecommerce/media_social/UpdateMediaSocialEcommerceController";

// --- EXPORTDATA --- //
import { ExportDataController } from "./controllers/export_data/ExportDataController";

// --- CATEGORY --- //
import { CategoriesController } from "./controllers/category/CategoriesController";
import { CategoryCreateController } from "./controllers/category/CategoryCreateController";
import { CategoryUpdateOrderController } from "./controllers/category/CategoryUpdateOrderController";
import { BulkCategoryImportController } from "./controllers/category/BulkCategoryImportController";
import { GenerateExcelCategoryController } from "./controllers/category/GenerateExcelCategoryController";
import { AllCategoriesController } from "./controllers/category/AllCategoriesController";
import { CategoryUpdateDataController } from "./controllers/category/CategoryUpdateDataController";
import { CategoryDeleteController } from "./controllers/category/CategoryDeleteController";
import { CategoryDeleteImageController } from "./controllers/category/CategoryDeleteImageController";

// --- PRODUCT --- //
import { CreateProductController } from "./controllers/product/CreateProductController";
import { AllProductsController } from "./controllers/product/AllProductsController";

// --- PROMOTION --- //
import { PromotionController } from "./controllers/promotion/PromotionController";
import { AllPromotionsController } from "./controllers/promotion/AllPromotionsController";
import { ProductUpdateDataController } from "./controllers/product/ProductUpdateDataController";
import { CmsGetProductController } from "./controllers/product/CmsGetProductController";
const promoCtrl = new PromotionController();






const router = Router();
const upload_image = multer(uploadConfig.upload("./images"));
const temp_file = multer(uploadConfig.upload("./temp_file"));
const controller = new ColorsController();

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
router.get('/colors', controller.getTheme);
router.put(
    '/colors',
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
router.get('/configuration_ecommerce/delete_all_files', isAuthenticatedEcommerce, checkRole(['SUPER_ADMIN']), new DeleteFilesExcelController().handle);

// --- TEMPLATES DE EMAILS --- //
router.post('/email-templates', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new CreateTemplateController().handle);
router.get('/all_templates/email-templates', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new TemplatesEmailsController().handle);
router.get('/template_email/content', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new GetTemplateContentController().handle);
router.get('/template_email/data', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new GetTemplateDataController().handle);
router.put('/template_email/update', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new UpdateTemplateContentController().handle);
router.put('/template_email/metadata', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new UpdateTemplateMetadataController().handle);
router.post('/template_email/render', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new RenderTemplateController().handle)
router.delete('/email-templates/delete', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new DeleteTemplateController().handle);

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

// --- SEO --- //
router.post('/seo/create', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), upload_image.fields([{ name: 'ogImages', maxCount: 5 }, { name: 'twitterImages', maxCount: 5 }]), new CreateSeoEcommerceController().handle);
router.put('/seo/update_seo', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), upload_image.fields([{ name: 'ogImages', maxCount: 5 }, { name: 'twitterImages', maxCount: 5 }]), new UpdateSeoSettingsController().handle);
router.get('/seo/get_seo', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new GetSeoUniqueController().handle);
router.delete('/seo/keyword', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new DeleteKeywordController().handle);
router.post('/seo/keyword', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new AddKeywordController().handle);
router.post('/seo/og-images', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), upload_image.array('images'), new AddOgImagesController().handle);
router.delete('/seo/og-image', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new DeleteOgImageController().handle);
router.post('/seo/twitter-images', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), upload_image.array('images'), new AddTwitterImagesController().handle);
router.delete('/seo/twitter-image', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new DeleteTwitterImageController().handle);
router.get('/seo/get_page', new CreateSeoEcommerceController().handle);
router.get('/seo/all_seos', new AllSeoEcommercePageController().handle);

// --- MEDIA SOCIAL --- //
router.post('/create/media_social', isAuthenticatedEcommerce, checkRole(['SUPER_ADMIN']), upload_image.single('file'), new CreateMediaSocialEcommerceController().handle);
router.put('/update/media_social', isAuthenticatedEcommerce, checkRole(['SUPER_ADMIN']), upload_image.single('file'), new UpdateMediaSocialEcommerceController().handle);
router.get('/get/media_social', new MediasSocialsEcommerceController().handle);
router.delete('/delete/media_social', isAuthenticatedEcommerce, checkRole(['SUPER_ADMIN']), new DeleteMediasSocialsEcommerceController().handle);

// --- EXPORTDATA --- //
router.post('/export_data', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new ExportDataController().handle);

// --- CATEGORY --- //
router.post('/category/create', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), upload_image.single('file'), new CategoryCreateController().handle);
router.get('/category/cms', isAuthenticatedEcommerce, new CategoriesController().handle);
router.put('/category/updateOrder', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new CategoryUpdateOrderController().handle);
router.post('/category/bulk_categories', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), temp_file.single("file"), new BulkCategoryImportController().handle);
router.get('/category/donwload_excel_categories', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new GenerateExcelCategoryController().handle);
router.get('/category/cms/all_categories', isAuthenticatedEcommerce, new AllCategoriesController().handle);
router.put('/category/update', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), upload_image.single('file'), new CategoryUpdateDataController().handle);
router.delete('/category/delete_category', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new CategoryDeleteController().handle);
router.put('/category/delete_image', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new CategoryDeleteImageController().handle);

// --- PRODUCT --- //
router.post("/product/create", isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), upload_image.fields([{ name: "imageFiles", maxCount: 20 }, { name: "variantImageFiles", maxCount: 20 }]), new CreateProductController().handle);
router.get('/get/products', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new AllProductsController().handle);
router.put("/product/update", isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), upload_image.fields([{ name: "imageFiles", maxCount: 20 }, { name: "variantImageFiles", maxCount: 20 }]), new ProductUpdateDataController().handle);
router.get('/product/cms/get', isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), new CmsGetProductController().handle);

// --- PROMOTION --- //
router.get('/promotions/get', isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), new AllPromotionsController().handle);
router.post('/promotions', isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), promoCtrl.create);
router.get('/promotions', isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), promoCtrl.list);
router.get('/promotions/:id', isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), promoCtrl.getById);
router.put('/promotions/:id', isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), promoCtrl.update);
router.delete('/promotions/:id', isAuthenticatedEcommerce, checkRole(["ADMIN", "SUPER_ADMIN"]), promoCtrl.delete);


export { router };