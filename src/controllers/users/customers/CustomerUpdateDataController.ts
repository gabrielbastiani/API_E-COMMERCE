import { Request, Response } from 'express';
import { CustomerUpdateDataService } from '../../../services/users/customers/CustomerUpdateDataService'; 

class CustomerUpdateDataController {
    async handle(req: Request, res: Response) {

        const {
            customer_id,
            name,
            email,
            status,
            password,
            phone,
            type_user,
            cpf,
            cnpj,
            date_of_birth,
            sexo,
            state_registration,
            newsletter
        } = req.body;

        const createUser = new CustomerUpdateDataService();

        let imageToUpdate = req.body.photo;
        if (req.file) {
            imageToUpdate = req.file.filename;
        }

        const users = await createUser.execute({
            customer_id,
            name,
            email,
            photo: imageToUpdate,
            status,
            password,
            phone,
            type_user,
            cpf,
            cnpj,
            date_of_birth,
            sexo,
            state_registration,
            newsletter
        });

        res.json(users);
    }
}

export { CustomerUpdateDataController };