import prismaClient from "../../prisma";

interface CAtegoryProps {
    slug: string;
}

class CategoryPageService {
    async execute({ slug }: CAtegoryProps) {
        const categ = await prismaClient.category.findFirst({
            where: {
                slug: slug
            }
        });

        return categ;
    }
}

export { CategoryPageService };