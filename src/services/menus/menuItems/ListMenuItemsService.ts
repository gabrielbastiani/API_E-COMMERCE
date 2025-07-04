import prismaClient from "../../../prisma";

export class ListMenuItemsService {
    async execute(menu_id?: string) {
        const items = await prismaClient.menuItem.findMany({
            where: menu_id ? { menu_id } : {},
            include: { children: true },
            orderBy: { order: "asc" },
        });
        return items;
    }
}