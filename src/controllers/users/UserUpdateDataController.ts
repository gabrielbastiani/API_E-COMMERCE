import { Request, Response } from 'express';
import { UserUpdateDataService } from '../../services/users/UserUpdateDataService'; 

class UserUpdateDataController {
    async handle(req: Request, res: Response) {

        const {
            userEcommerce_id,
            name,
            email,
            role,
            status,
            password
        } = req.body;

        const createUser = new UserUpdateDataService();

        let imageToUpdate = req.body.photo;
        if (req.file) {
            imageToUpdate = req.file.filename;
        }

        const users = await createUser.execute({
            userEcommerce_id,
            name,
            email,
            photo: imageToUpdate,
            role,
            status,
            password
        });

        res.json(users);
    }
}

export { UserUpdateDataController };