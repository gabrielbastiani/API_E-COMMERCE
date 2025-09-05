import { Request, Response } from 'express'
import { CustomerOrderService } from '../../../../services/users/customers/orders/CustomerOrderService';

class CustomerOrderController {
    async handle(req: Request, res: Response) {

        const customer_id = req.query.customer_id as string;

        const orders = new CustomerOrderService();

        const customer_orders = await orders.execute({ customer_id });

        res.json(customer_orders);

    }
}

export { CustomerOrderController }