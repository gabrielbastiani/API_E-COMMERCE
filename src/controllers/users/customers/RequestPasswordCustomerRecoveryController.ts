import { Request, Response } from "express";
import { RequestPasswordCustomerRecoveryService } from "../../../services/users/customers/RequestPasswordCustomerRecoveryService";  

class RequestPasswordCustomerRecoveryController {
  async handle(req: Request, res: Response) {
    const { email } = req.body;

    const requestPasswordRecovery = new RequestPasswordCustomerRecoveryService();

    const user = await requestPasswordRecovery.execute({
      email,
    });

    res.json(user)
  }
}

export { RequestPasswordCustomerRecoveryController };