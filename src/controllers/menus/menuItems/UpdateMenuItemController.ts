import { Request, Response } from "express";
import { UpdateMenuItemService } from "../../../services/menus/menuItems/UpdateMenuItemService";

export class UpdateMenuItemController {
    async handle(req: Request, res: Response) {
        const { id } = req.params;
        // multer coloca o arquivo em req.file
        const iconFileName = req.file ? req.file.filename : undefined;

        const dto = {
            id,
            ...req.body,
            iconFileName,
            // converter strings para números/booleanos quando necessário
            isActive: req.body.isActive !== undefined
                ? req.body.isActive === "true"
                : undefined,
            order: req.body.order !== undefined
                ? Number(req.body.order)
                : undefined,
            // para desconectar passar explicitamente null no campo correspondente
            category_id: req.body.category_id ?? undefined,
            productId: req.body.productId ?? undefined,
            customPageSlug: req.body.customPageSlug ?? undefined,
            menu_id: req.body.menu_id ?? undefined,
            parentId: req.body.parentId ?? undefined,
        };

        const updated = await new UpdateMenuItemService().execute(dto);
        res.json(updated);
    }
}