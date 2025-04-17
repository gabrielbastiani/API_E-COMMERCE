import { Request, Response } from 'express'
import { CustomerPhotoDeleteService } from '../../../services/users/customers/CustomerPhotoDeleteService';

class CustomerPhotoDeleteController {
    async handle(req: Request, res: Response) {

        const customer_id = req.query.customer_id as string;

        const detail_user = new CustomerPhotoDeleteService();

        const user = await detail_user.execute({ customer_id });

        res.json(user);

    }
}

export { CustomerPhotoDeleteController }