import { Request, Response } from 'express';
import { CreateConfigurationService } from '../../../services/configuration_ecommerce/CreateConfigurationService'; 

class CreateConfigurationController {
    async handle(req: Request, res: Response) {
        const {
            name, email, logo, favicon
        } = req.body;

        let imageToUpdate = logo;
        let imageFavicon = favicon;

        const create_configuration = new CreateConfigurationService();

        if (req.files) {/* @ts-ignore */
            if (req.files['logo']) {/* @ts-ignore */
                imageToUpdate = req.files['logo'][0].filename;
            }/* @ts-ignore */
            if (req.files['favicon']) {/* @ts-ignore */
                imageFavicon = req.files['favicon'][0].filename;
            }
        }

        const configuration = await create_configuration.execute({
            name,
            logo: imageToUpdate,
            favicon: imageFavicon,
            email
        });

        res.json(configuration);
    }
}

export { CreateConfigurationController };