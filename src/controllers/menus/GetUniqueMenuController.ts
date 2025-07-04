import { Request, Response } from "express";
import { GetUniqueMenuService } from "../../services/menus/GetUniqueMenuService"; 

class GetUniqueMenuController {
    async handle(req: Request, res: Response) {
        const id = req.query.id as string;

        const menusGet = new GetUniqueMenuService();

        const menu = await menusGet.execute({id });

        res.json(menu);
    }
}

export { GetUniqueMenuController }