import { Request, Response } from 'express'
import { ListAddressCustomerService } from '../../../../services/users/customers/address/ListAddressCustomerService'; 

class ListAddressCustomerController {
    async handle(req: Request, res: Response) {

        const customer_id = req.query.customer_id as string;

        const address = new ListAddressCustomerService();

        const customer = await address.execute({ customer_id });

        res.json(customer);

    }
}

export { ListAddressCustomerController }