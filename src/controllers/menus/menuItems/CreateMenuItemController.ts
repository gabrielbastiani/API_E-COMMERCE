import { Request, Response } from "express";
import { CreateMenuItemService } from "../../../services/menus/menuItems/CreateMenuItemService"; 

export class CreateMenuItemController {
  async handle(req: Request, res: Response) {
    // o Multer colocou o nome do arquivo em req.file.filename
    const iconFilename = req.file ? req.file.filename : undefined;

    const data = {
      ...req.body,
      icon: iconFilename,
      // observe que req.body.menu_id virá como string
      // e req.body.isActive / order podem vir como string também
      isActive: req.body.isActive === "false" ? false : true,
      order: req.body.order ? Number(req.body.order) : undefined,
    };

    const item = await new CreateMenuItemService().execute(data);
    res.status(201).json(item);
  }
}