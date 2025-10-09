import { Router } from "express";
import { body } from "express-validator/lib/middlewares/validation-chain-builders";
import { isAuthenticatedEcommerce } from "../../middlewares/isAuthenticatedEcommerce";
import { checkRole } from "../../middlewares/checkRole";

import { ColorsController } from "../../controllers/configuration_ecommerce/colors_setting/ColorsController";
const controller = new ColorsController();

const router = Router();

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

export default router;