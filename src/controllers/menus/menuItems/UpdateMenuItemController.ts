import { Request, Response } from "express";
import { UpdateMenuItemService } from "../../../services/menus/menuItems/UpdateMenuItemService";

export class UpdateMenuItemController {
    async handle(req: Request, res: Response) {
        const { id } = req.params;
        const iconFileName = req.file?.filename;
        const parentIdRaw = req.body.parentId;
        const parentId = parentIdRaw && parentIdRaw !== ''
            ? parentIdRaw
            : undefined

        // converter tipos e tratar strings vazias como null
        const dto = {
            id,
            label: req.body.label,
            type: req.body.type,
            url: req.body.url ?? null,
            category_id: req.body.category_id ?? null,
            product_id: req.body.product_id ?? null,
            customPageSlug: req.body.customPageSlug ?? null,
            isActive: req.body.isActive !== undefined ? req.body.isActive === "true" : undefined,
            order: req.body.order !== undefined ? Number(req.body.order) : undefined,
            menu_id: req.body.menu_id ?? null,
            parentId,
            iconFileName,
        };

        try {
            const updated = await new UpdateMenuItemService().execute(dto);
            res.json(updated);
        } catch (err: any) {
            console.error("Erro ao atualizar MenuItem:", err);
            res.status(400).json({ message: err.message });
        }
    }
}