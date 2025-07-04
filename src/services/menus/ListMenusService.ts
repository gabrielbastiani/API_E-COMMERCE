import prismaClient from "../../prisma";

export class ListMenusService {
    async execute() {
        const menus = await prismaClient.menu.findMany({
            include: { items: true },
            orderBy: { order: "asc" },
        });
        return menus;
    }
}