import { Router } from "express";
import { isAuthenticatedEcommerce } from "../../middlewares/isAuthenticatedEcommerce";
import { checkRole } from "../../middlewares/checkRole";
import { ExportDataController } from "../../controllers/export_data/ExportDataController";

const router = Router();

router.post('/export_data', isAuthenticatedEcommerce, checkRole(['ADMIN', 'SUPER_ADMIN']), new ExportDataController().handle);

export default router;