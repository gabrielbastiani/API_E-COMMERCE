import { Request, Response } from "express";
import { RequestPasswordUserRecoveryService } from "../../services/users/RequestPasswordUserRecoveryService";  

class RequestPasswordUserRecoveryController {
  async handle(req: Request, res: Response) {
    const { email } = req.body;

    const requestPasswordRecovery = new RequestPasswordUserRecoveryService();

    const user = await requestPasswordRecovery.execute({
      email,
    });

    res.json(user)
  }
}

export { RequestPasswordUserRecoveryController };