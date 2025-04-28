import { Request, Response } from 'express';
import { UpdateConfigurationEcommerceService } from '../../services/configuration_ecommerce/UpdateConfigurationEcommerceService';

class UpdateConfigurationEcommerceController {
    async handle(req: Request, res: Response) {

        const {
            ecommerceData_id,
            name,
            whatsapp,
            phone,
            email,
            city,
            state,
            street,
            zipCode,
            number,
            neighborhood,
            country,
            privacy_policies,
            about_store,
            exchanges_and_returns,
            how_to_buy,
            shipping_delivery_time,
            faq,
            payment_methods,
            technical_assistance
        } = req.body;

        let imageToUpdate = req.body.logo;
        let imageToUpdatefavicon = req.body.favicon;

        const update_configs = new UpdateConfigurationEcommerceService();

        if (req.files) {/* @ts-ignore */
            if (req.files['logo']) {/* @ts-ignore */
                imageToUpdate = req.files['logo'][0].filename;
            }/* @ts-ignore */
            if (req.files['favicon']) {/* @ts-ignore */
                imageToUpdatefavicon = req.files['favicon'][0].filename;
            }
        }

        const configs = await update_configs.execute({
            ecommerceData_id,
            name,
            whatsapp,
            logo: imageToUpdate,
            favicon: imageToUpdatefavicon,
            phone,
            email,
            city,
            state,
            street,
            zipCode,
            number,
            neighborhood,
            country,
            privacy_policies,
            about_store,
            exchanges_and_returns,
            how_to_buy,
            shipping_delivery_time,
            faq,
            payment_methods,
            technical_assistance
        });

        res.json(configs);
    }
}

export { UpdateConfigurationEcommerceController };