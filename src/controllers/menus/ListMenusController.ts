import { Request, Response } from "express";
import { ListMenusService } from "../../services/menus/ListMenusService";

export class ListMenusController {
    async handle(_req: Request, res: Response) {
        const menus = await new ListMenusService().execute();
        res.json(menus);
    }
}