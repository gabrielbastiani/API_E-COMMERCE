import { Request, Response } from 'express';
import { UserDeleteService } from '../../services/users/UserDeleteService'; 

class UserDeleteController {
    async handle(req: Request, res: Response) {
        let { id_delete, name, userEcommerce_id } = req.body;

        if (!Array.isArray(id_delete)) {
            id_delete = [id_delete];
        }

        const detail_user = new UserDeleteService();
        const user = await detail_user.execute({ id_delete, name, userEcommerce_id });

        res.json(user);
    }
}

export { UserDeleteController };