import { Request, Response } from "express";
import { StatusMenuService } from "../../services/menus/StatusMenuService"; 

class StatusMenuController {
    async handle(req: Request, res: Response) {
        const { menu_id, isActive } = req.body;

        const statusMenu = new StatusMenuService();

        const menu = await statusMenu.execute({ menu_id, isActive });

        res.json(menu);
    }
}

export { StatusMenuController }