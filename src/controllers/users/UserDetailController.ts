import { Request, Response } from 'express'
import { UserDetailService } from '../../services/users/UserDetailService'; 

class UserDetailController {
    async handle(req: Request, res: Response) {

        const userEcommerce_id = req.query.userEcommerce_id as string;

        const detail_user = new UserDetailService();

        const user = await detail_user.execute({ userEcommerce_id });

        res.json(user);

    }
}

export { UserDetailController }