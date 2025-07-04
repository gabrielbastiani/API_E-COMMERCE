import fs from "fs";
import path from "path";
import { Prisma } from "@prisma/client";
import prismaClient from "../../../prisma";

interface UpdateMenuItemDTO {
    id: string;
    label?: string;
    type?: "INTERNAL_LINK" | "EXTERNAL_LINK" | "CATEGORY" | "PRODUCT" | "CUSTOM_PAGE";
    url?: string;
    category_id?: string | null;    // null para desconectar
    productId?: string | null;
    customPageSlug?: string | null;
    iconFileName?: string;           // novo nome de arquivo, recebido do multer
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
            productId,
            customPageSlug,
            iconFileName,
            isActive,
            order,
            menu_id,
            parentId,
        } = data;

        // 1) Buscamos o item existente, para podermos limpar o ícone antigo
        const existing = await prismaClient.menuItem.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new Error("MenuItem não encontrado");
        }

        // 2) Se veio um novo ícone e havia um antigo, removemos o arquivo antigo do disco
        if (iconFileName && existing.icon) {
            const oldPath = path.resolve("uploads/icons", existing.icon);
            fs.unlink(oldPath, (err) => {
                // só logamos o erro, não interrompemos a execução
                if (err) console.warn("Falha ao remover ícone antigo:", err);
            });
        }

        // 3) Montamos o objeto de update usando nested connect / disconnect
        const updateData: Prisma.MenuItemUpdateInput = {
            // campos escalares
            ...(label !== undefined && { label }),
            ...(type !== undefined && { type }),
            ...(url !== undefined && { url }),
            icon: iconFileName !== undefined ? iconFileName : undefined,
            ...(isActive !== undefined && { isActive }),
            ...(order !== undefined && { order }),

            // relações – connect, ou disconnect se veio null explicitamente
            ...(category_id !== undefined && {
                category: category_id
                    ? { connect: { id: category_id } }
                    : { disconnect: true },
            }),
            ...(productId !== undefined && {
                product: productId
                    ? { connect: { id: productId } }
                    : { disconnect: true },
            }),
            ...(customPageSlug !== undefined && {
                customPage: customPageSlug
                    ? { connect: { slug: customPageSlug } }
                    : { disconnect: true },
            }),
            ...(menu_id !== undefined && {
                menu: menu_id
                    ? { connect: { id: menu_id } }
                    : { disconnect: true },
            }),
            ...(parentId !== undefined && {
                parent: parentId
                    ? { connect: { id: parentId } }
                    : { disconnect: true },
            }),
        };

        // 4) Efetua o update
        const updated = await prismaClient.menuItem.update({
            where: { id },
            data: updateData,
            include: { children: true },
        });

        return updated;
    }
}