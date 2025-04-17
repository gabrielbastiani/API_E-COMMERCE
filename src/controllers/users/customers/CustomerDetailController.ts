import { Request, Response } from 'express'
import { CustomerDetailService } from '../../../services/users/customers/CustomerDetailService'; 

class CustomerDetailController {
    async handle(req: Request, res: Response) {

        const customer_id = req.query.customer_id as string;

        const detail_user = new CustomerDetailService();

        const user = await detail_user.execute({ customer_id });

        res.json(user);

    }
}

export { CustomerDetailController }