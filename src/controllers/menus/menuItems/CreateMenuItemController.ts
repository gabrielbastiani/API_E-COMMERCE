import { Request, Response } from "express";
import { CreateMenuItemService } from "../../../services/menus/menuItems/CreateMenuItemService";

export class CreateMenuItemController {
  async handle(req: Request, res: Response) {
    const iconFilename = req.file?.filename;

    // Converta isActive e order e trate parentId vazio como undefined:
    const isActive = req.body.isActive === "false" ? false : true;
    const order = req.body.order ? Number(req.body.order) : undefined;
    const parentId = req.body.parentId && req.body.parentId !== ""
      ? req.body.parentId
      : undefined;

    const data = {
      ...req.body,
      icon: iconFilename,
      isActive,
      order,
      parentId,        // undefined ou string válida
    };

    const item = await new CreateMenuItemService().execute(data);
    res.status(201).json(item);
  }
}