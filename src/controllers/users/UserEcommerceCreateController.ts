import { Request, Response } from 'express';
import { UserEcommerceCreateService } from '../../services/users/UserEcommerceCreateService';

class UserEcommerceCreateController {
    async handle(req: Request, res: Response) {
        const {
            name,
            email,
            password,
            photo,
            role,
            send_email
        } = req.body;

        const createUser = new UserEcommerceCreateService();

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

        return res.json(users)

    }
}

export { UserEcommerceCreateController }