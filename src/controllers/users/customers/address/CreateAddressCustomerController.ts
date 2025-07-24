import { Request, Response } from 'express';
import { CreateAddressCustomerService } from '../../../../services/users/customers/address/CreateAddressCustomerService'; 

class CreateAddressCustomerController {
    async handle(req: Request, res: Response) {
        const {
            customer_id,
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

        const createAddress = new CreateAddressCustomerService();

        const address = await createAddress.execute({
            customer_id,
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

        res.json(address)

    }
}

export { CreateAddressCustomerController }