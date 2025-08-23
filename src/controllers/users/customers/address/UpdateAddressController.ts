import { Request, Response } from 'express'
import { UpdateAddressService } from '../../../../services/users/customers/address/UpdateAddressService';

class UpdateAddressController {
    async handle(req: Request, res: Response) {

        const {
            address_id,
            recipient_name,
            street,
            city,
            state,
            zipCode,
            number,
            neighborhood,
            country,
            complement,
            reference
        } = req.body;

        const address = new UpdateAddressService();

        const customer = await address.execute({
            address_id,
            recipient_name,
            street,
            city,
            state,
            zipCode,
            number,
            neighborhood,
            country,
            complement,
            reference
        });

        res.json(customer);

    }
}

export { UpdateAddressController }