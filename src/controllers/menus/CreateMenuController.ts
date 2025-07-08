import { Request, Response } from "express";
import { CreateMenuService } from "../../services/menus/CreateMenuService";

export class CreateMenuController {
    async handle(req: Request, res: Response) {
        const { name, icon } = req.body;

        // 1) parsear isActive e order vindos como string
        const isActiveRaw = req.body.isActive;
        const orderRaw = req.body.order;

        const isActive = ((): boolean => {
            if (typeof isActiveRaw === "boolean") return isActiveRaw;
            if (typeof isActiveRaw === "string") {
                return isActiveRaw.toLowerCase() === "true";
            }
            return true; // default
        })();

        const order = Number(orderRaw);
        if (isNaN(order)) {
            res.status(400).json({ message: "order precisa ser número" });
        }

        // 2) icon: se veio no body ou no arquivo
        let imageToUpdate = icon;
        if (!icon && req.file) {
            imageToUpdate = req.file.filename;
        }

        // 3) chama o service com tipos corretos
        const menu = await new CreateMenuService().execute({
            name,
            isActive,
            order,
            icon: imageToUpdate,
        });

        res.status(201).json(menu);
    }
}