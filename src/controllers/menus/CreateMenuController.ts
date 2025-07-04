import { Request, Response } from "express";
import { CreateMenuService } from "../../services/menus/CreateMenuService";

export class CreateMenuController {
    async handle(req: Request, res: Response) {
        const { name, isActive, order } = req.body;
        const menu = await new CreateMenuService().execute({ name, isActive, order });
        res.status(201).json(menu);
    }
}