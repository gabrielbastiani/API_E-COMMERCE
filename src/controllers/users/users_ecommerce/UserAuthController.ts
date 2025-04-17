import { Request, Response } from "express";
import { UserAuthService } from "../../../services/users/users_ecommerce/UserAuthService"; 

class UserAuthController {
    async handle(req: Request, res: Response) {
        const { email, password } = req.body;

        const authUserService = new UserAuthService();

        const auth = await authUserService.execute({
            email,
            password
        })

        res.json(auth);
    }
}

export { UserAuthController }