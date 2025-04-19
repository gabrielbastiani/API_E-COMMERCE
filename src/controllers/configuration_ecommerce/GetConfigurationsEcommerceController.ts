import { Request, Response } from 'express'
import { GetConfigurationsEcommerceService } from '../../services/configuration_ecommerce/GetConfigurationsEcommerceService'; 

class GetConfigurationsEcommerceController {
    async handle(req: Request, res: Response) {

        const configs = new GetConfigurationsEcommerceService();

        const ecommerce = await configs.execute();

        res.json(ecommerce);

    }
}

export { GetConfigurationsEcommerceController }