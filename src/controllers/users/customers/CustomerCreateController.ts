import { Request, Response } from 'express';
import { CustomerCreateService } from '../../../services/users/customers/CustomerCreateService';

class CustomerCreateController {
    async handle(req: Request, res: Response) {
        const {
            name,
            email,
            password,
            photo,
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

        let imageToUpdate = photo;
        if (!photo && req.file) {
            imageToUpdate = req.file.filename;
        }

        const users = await createUser.execute({
            name,
            email,
            password,
            photo: imageToUpdate,
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