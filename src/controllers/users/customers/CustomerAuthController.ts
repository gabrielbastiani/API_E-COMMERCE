import { Request, Response } from "express";
import { CustomerAuthService } from "../../../services/users/customers/CustomerAuthService"; 

class CustomerAuthController {
    async handle(req: Request, res: Response) {
        const { email, password } = req.body;

        const authUserService = new CustomerAuthService();

        const auth = await authUserService.execute({
            email,
            password
        })

        res.json(auth);
    }
}

export { CustomerAuthController }