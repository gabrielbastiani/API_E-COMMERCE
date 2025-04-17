import { Request, Response } from "express";
import { PasswordRecoveryUserSevice } from "../../../services/users/users_ecommerce/PasswordRecoveryUserSevice";  

class PasswordRecoveryUserController {
  async handle(req: Request, res: Response) {
    const passwordRecoveryUserEcommerce_id = req.query.passwordRecoveryUserEcommerce_id as string;

    const { password } = req.body;

    const passwordRecovery = new PasswordRecoveryUserSevice();

    const recoveryPassword = await passwordRecovery.execute({
      passwordRecoveryUserEcommerce_id,
      password,
    });

    res.json(recoveryPassword)
  }

}

export { PasswordRecoveryUserController };