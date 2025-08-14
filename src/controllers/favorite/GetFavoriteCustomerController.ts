import { Request, Response } from 'express';
import { GetFavoriteCustomerService } from '../../services/favorite/GetFavoriteCustomerService';

class GetFavoriteCustomerController {
    async handle(req: Request, res: Response) {

        const customer_id = req.query.customer_id as string;

        const create_favorite = new GetFavoriteCustomerService();

        const favorite = await create_favorite.execute({
            customer_id
        });

        res.json(favorite)

    }
}

export { GetFavoriteCustomerController }