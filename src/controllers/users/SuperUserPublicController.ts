import { Request, Response } from "express";
import { SuperUserPublicService } from "../../services/users/SuperUserPublicService"; 

class SuperUserPublicController {
    async handle(req: Request, res: Response) {

        const user_super = new SuperUserPublicService();

        const user = await user_super.execute()

        res.json(user);
    }
}

export { SuperUserPublicController }