import prismaClient from "../../prisma";

interface CreateMenuDTO {
    name: string;
    isActive?: boolean;
    order?: number;
}

export class CreateMenuService {
    async execute({ name, isActive = true, order = 0 }: CreateMenuDTO) {
        const menu = await prismaClient.menu.create({
            data: { name, isActive, order },
        });
        return menu;
    }
}