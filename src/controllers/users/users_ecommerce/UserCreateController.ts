import { Request, Response } from 'express';
import { UserCreateService } from '../../../services/users/users_ecommerce/UserCreateService';

class UserCreateController {
    async handle(req: Request, res: Response): Promise<void> {
        const {
            name,
            email,
            password,
            photo,
            role,
            send_email
        } = req.body;

        const createUser = new UserCreateService();

        let imageToUpdate = photo;
        if (!photo && req.file) {
            imageToUpdate = req.file.filename;
        }

        const users = await createUser.execute({
            name,
            email,
            password,
            photo: imageToUpdate,
            role,
            send_email
        });

        res.json(users)

    }
}

export { UserCreateController }