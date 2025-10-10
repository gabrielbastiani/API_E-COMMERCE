import fs from "fs";
import path from "path";
import { Prisma } from "@prisma/client";
import prismaClient from "../../../prisma";

interface UpdateMenuItemDTO {
    id: string;
    label?: string;
    type?: "INTERNAL_LINK" | "EXTERNAL_LINK" | "CATEGORY" | "PRODUCT" | "CUSTOM_PAGE";
    url?: string | null;
    category_id?: string | null;
    product_id?: string | null;
    customPageSlug?: string | null;
    iconFileName?: string; // filename novo
    isActive?: boolean;
    order?: number;
    menu_id?: string | null;
    parentId?: string | null;
}

export class UpdateMenuItemService {
    async execute(data: UpdateMenuItemDTO) {
        const {
            id,
            label,
            type,
            url,
            category_id,
            product_id,
            customPageSlug,
            iconFileName,
            isActive,
            order,
            menu_id,
            parentId,
        } = data;

        // 1) busca existente p/ limpar ícone antigo
        const existing = await prismaClient.menuItem.findUnique({ where: { id } });
        if (!existing) throw new Error("MenuItem não encontrado");

        // 2) remove ícone antigo se há um novo upload
        if (iconFileName && existing.icon) {
            const oldPath = path.resolve("images", "menu", existing.icon);
            fs.unlink(oldPath, err => err && console.warn("falha ao remover ícone antigo:", err));
        }

        // 3) monta unchecked update input (campos escalares diretamente)
        const updateData: Prisma.MenuItemUncheckedUpdateInput = {
            ...(label !== undefined && { label }),
            ...(type !== undefined && { type }),
            ...(url !== undefined && { url }),
            ...(category_id !== undefined && { category_id }),
            ...(product_id !== undefined && { product_id }),
            ...(customPageSlug !== undefined && { customPageSlug }),
            ...(isActive !== undefined && { isActive }),
            ...(order !== undefined && { order }),
            ...(menu_id !== undefined && { menu_id }),
            ...(parentId !== undefined && { parentId }),
            ...(iconFileName !== undefined && { icon: iconFileName }),
        };

        // 4) executa update
        const updated = await prismaClient.menuItem.update({
            where: { id },
            data: updateData,
            include: { children: true },
        });

        return updated;
    }
}