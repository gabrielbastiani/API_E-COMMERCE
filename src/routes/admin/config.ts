import { Router } from "express";
import multer from "multer";
import uploadConfig from "../../config/multer";
import { isAuthenticatedEcommerce } from "../../middlewares/isAuthenticatedEcommerce";
import { checkRole } from "../../middlewares/checkRole";

import { CreateConfigurationController } from "../../controllers/configuration_ecommerce/CreateConfigurationController";
import { DeleteFilesExcelController } from "../../controllers/configuration_ecommerce/DeleteFilesExcelController";
import { UpdateConfigurationEcommerceController } from "../../controllers/configuration_ecommerce/UpdateConfigurationEcommerceController";
import { GetConfigurationsEcommerceController } from "../../controllers/configuration_ecommerce/GetConfigurationsEcommerceController";

const router = Router();
const upload_image = multer(uploadConfig.upload("./images"));

router.post('/create/ecommerce', upload_image.fields([{ name: 'logo', maxCount: 1 }, { name: 'favicon', maxCount: 1 }]), new CreateConfigurationController().handle);
router.put('/configuration_ecommerce/update', isAuthenticatedEcommerce, checkRole(['SUPER_ADMIN']), upload_image.fields([{ name: 'logo', maxCount: 1 }, { name: 'favicon', maxCount: 1 }]), new UpdateConfigurationEcommerceController().handle);
router.get('/configuration_ecommerce/get_configs', new GetConfigurationsEcommerceController().handle);
router.get('/configuration_ecommerce/delete_all_files', isAuthenticatedEcommerce, checkRole(['SUPER_ADMIN']), new DeleteFilesExcelController().handle);

export default router;