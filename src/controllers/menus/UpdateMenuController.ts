import { Request, Response } from "express";
import { UpdateMenuService } from "../../services/menus/UpdateMenuService";

export class UpdateMenuController {
  async handle(req: Request, res: Response) {
    const { id } = req.params;
    const data = req.body;
    const menu = await new UpdateMenuService().execute({ id, ...data });
    res.json(menu);
  }
}