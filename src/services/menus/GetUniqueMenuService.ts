import prismaClient from "../../prisma";

interface MenuProps {
    id: string;
}

class GetUniqueMenuService {
    async execute({ id }: MenuProps) {
        const menu = await prismaClient.menu.findUnique({
            where: {
                id: id
            },
            include: {
                items: true
            }
        });

        return menu;

    }
}

export { GetUniqueMenuService }