import prismaClient from "../../prisma";
import { MenuItem as PrismaMenuItem } from "@prisma/client";

// DTO que irá para o front
export type MenuItemDTO = {
    id: string;
    label: string;
    type: string;
    url: string | null;
    category_id: string | null;
    customPageSlug: string | null;
    icon: string | null;
    order: number;
    parentId: string | null;
    children: MenuItemDTO[];
};

export class MenuHeaderService {
    static async getTopMenu(): Promise<MenuItemDTO[]> {
        // 1) busca o menu ativo
        const menu = await prismaClient.menu.findFirst({
            where: { isActive: true },
            orderBy: { order: "asc" },
            select: { id: true },
        });
        if (!menu) return [];

        // 2) busca todos os itens desse menu
        const rawItems = await prismaClient.menuItem.findMany({
            where: { menu_id: menu.id, isActive: true },
            orderBy: { order: "asc" },
            select: {
                id: true,
                label: true,
                type: true,
                url: true,
                category_id: true,
                customPageSlug: true,
                icon: true,
                order: true,
                parentId: true,
            },
        });

        // 3) mapeia em DTOs iniciais (sem children)
        const itemsMap: Record<string, MenuItemDTO> = {};
        rawItems.forEach((it) => {
            itemsMap[it.id] = {
                id: it.id,
                label: it.label,
                type: it.type,
                url: it.url,
                category_id: it.category_id,
                customPageSlug: it.customPageSlug,
                icon: it.icon,
                order: it.order,
                parentId: it.parentId,
                children: [],
            };
        });

        // 4) constrói árvore
        const tree: MenuItemDTO[] = [];
        rawItems.forEach((it) => {
            const dto = itemsMap[it.id];
            if (it.parentId) {
                // se tiver parent, adiciona como filho
                itemsMap[it.parentId]?.children.push(dto);
            } else {
                // se não tiver parentId, é raiz
                tree.push(dto);
            }
        });

        return tree;
    }
}