import { NotificationType, Role } from "@prisma/client";
import prismaClient from "../../prisma";

interface CategoryRequest {
    userEcommerce_id: string;
    name: string;
    image?: string;
    description?: string;
    parentId?: string;
}

class CategoryCreateService {
    async execute({ userEcommerce_id, name, image, description, parentId }: CategoryRequest) {
        if (!name) {
            throw new Error("O nome da categoria é obrigatório.");
        }

        function removerAcentos(s: any) {
            return s.normalize('NFD')
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .replace(/ +/g, "-")
                .replace(/-{2,}/g, "-")
                .replace(/[/]/g, "-");
        }

        // Busca o maior valor de `order` entre as categorias com o mesmo `parentId`
        const maxOrderCategory = await prismaClient.category.findFirst({
            where: { parentId: parentId || null },
            orderBy: { order: 'desc' },
        });

        // Define o valor de `order` para a nova categoria
        const newOrder = maxOrderCategory ? maxOrderCategory.order + 1 : 1;

        // Cria a nova categoria com o valor de `order` definido
        const category = await prismaClient.category.create({
            data: {
                name,
                slug: removerAcentos(name),
                image: image,
                description: description,
                parentId: parentId || null,
                order: newOrder,
            }
        });

        // Notificação de criação para administradores e superadministradores
        const user_data = await prismaClient.userEcommerce.findUnique({
            where: { id: userEcommerce_id }
        });

        const users_superAdmins = await prismaClient.userEcommerce.findMany({
            where: { role: Role.SUPER_ADMIN }
        });

        const users_admins = await prismaClient.userEcommerce.findMany({
            where: { role: Role.ADMIN }
        });

        const all_user_ids = [
            ...users_superAdmins.map(userEcommerce => userEcommerce.id),
            ...users_admins.map(userEcommerce => userEcommerce.id)
        ];

        const notificationsData = all_user_ids.map(userEcommerce_id => ({
            userEcommerce_id,
            message: `Categoria ${name} criada pelo usuário ${user_data?.name}.`,
            type: NotificationType.CATEGORY
        }));

        await prismaClient.notificationUserEcommerce.createMany({
            data: notificationsData
        });

        return category;
    }
}

export { CategoryCreateService };