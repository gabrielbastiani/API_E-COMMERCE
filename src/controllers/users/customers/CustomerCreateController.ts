import { Request, Response } from 'express';
import { CustomerCreateService } from '../../../services/users/customers/CustomerCreateService';

class CustomerCreateController {
    async handle(req: Request, res: Response) {
        const {
            name,
            email,
            password,
            newsletter,
            phone,
            type_user,
            cpf,
            cnpj,
            date_of_birth,
            sexo,
            state_registration,
        } = req.body;

        const createUser = new CustomerCreateService();

        const users = await createUser.execute({
            name,
            email,
            password,
            newsletter,
            phone,
            type_user,
            cpf,
            cnpj,
            date_of_birth,
            sexo,
            state_registration,
        });

        res.json(users)

    }
}

export { CustomerCreateController }