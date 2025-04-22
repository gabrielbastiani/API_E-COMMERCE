import { Request, Response } from 'express'
import { GetSeoUniqueService } from '../../../services/configuration_ecommerce/seo/GetSeoUniqueService'; 

class GetSeoUniqueController {
    async handle(req: Request, res: Response) {

        const sEOSettings_id = req.query.sEOSettings_id as string;

        const seo = new GetSeoUniqueService();

        const ecommerce = await seo.execute({ sEOSettings_id });

        res.json(ecommerce);

    }
}

export { GetSeoUniqueController }