import { Request, Response } from 'express';
import { CreateFavoriteService } from '../../services/favorite/CreateFavoriteService'; 

class CreateFavoriteController {
    async handle(req: Request, res: Response) {
        const {
            customer_id,
            product_id
        } = req.body;

        const create_favorite = new CreateFavoriteService();

        const favorite = await create_favorite.execute({
            customer_id,
            product_id
        });

        res.json(favorite)

    }
}

export { CreateFavoriteController }