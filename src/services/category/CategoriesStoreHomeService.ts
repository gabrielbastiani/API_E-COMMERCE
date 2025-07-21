import prismaClient from "../../prisma";
import { StatusCategory } from "@prisma/client";

class CategoriesStoreHomeService {
    async execute() {
        const all_categories = await prismaClient.category.findMany({
            where: { status: StatusCategory.DISPONIVEL },
            orderBy: { created_at: "asc" },
            include: {
                children: {
                    where: { status: StatusCategory.DISPONIVEL },
                    select: {
                        id: true,
                        slug: true,
                        name: true,
                        image: true
                    }
                }
            }
        });

        return all_categories;
    }
}

export { CategoriesStoreHomeService };