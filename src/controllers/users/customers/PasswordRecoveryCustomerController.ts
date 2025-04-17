import { Request, Response } from "express";
import { PasswordRecoveryCustomerSevice } from "../../../services/users/customers/PasswordRecoveryCustomerSevice"; 

class PasswordRecoveryCustomerController {
  async handle(req: Request, res: Response) {
    const passwordRecoveryCustomer_id = req.query.passwordRecoveryCustomer_id as string;

    const { password } = req.body;

    const passwordRecovery = new PasswordRecoveryCustomerSevice();

    const recoveryPassword = await passwordRecovery.execute({
      passwordRecoveryCustomer_id,
      password,
    });

    res.json(recoveryPassword)
  }

}

export { PasswordRecoveryCustomerController };