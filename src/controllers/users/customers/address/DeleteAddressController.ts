import { Request, Response } from 'express'
import { DeleteAddressService } from '../../../../services/users/customers/address/DeleteAddressService';

class DeleteAddressController {
    async handle(req: Request, res: Response) {

        const address_id = req.query.address_id as string;

        const address = new DeleteAddressService();

        const customer = await address.execute({ address_id });

        res.json(customer);

    }
}

export { DeleteAddressController }