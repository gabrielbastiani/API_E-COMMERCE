import { Request, Response } from 'express'
import { UserPhotoDeleteService } from '../../../services/users/users_ecommerce/UserPhotoDeleteService'; 

class UserPhotoDeleteController {
    async handle(req: Request, res: Response) {

        const userEcommerce_id = req.query.userEcommerce_id as string;

        const detail_user = new UserPhotoDeleteService();

        const user = await detail_user.execute({ userEcommerce_id });

        res.json(user);

    }
}

export { UserPhotoDeleteController }