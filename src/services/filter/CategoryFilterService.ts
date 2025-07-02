import prismaClient from "../../prisma";

interface CreateCategoryFilterDTO {
    category_id: string;
    filter_id: string;
}

interface UpdateCategoryFilterDTO extends Partial<CreateCategoryFilterDTO> {
    id: string;
}

class CategoryFilterService {
    async create(data: CreateCategoryFilterDTO) {
        return prismaClient.categoryFilter.create({ data });
    }

    async findAll() {
        return prismaClient.categoryFilter.findMany({
            include: { category: true, filter: true }
        });
    }

    async findById(id: string) {
        return prismaClient.categoryFilter.findUnique({
            where: { id },
            include: { category: true, filter: true }
        });
    }

    async update({ id, ...rest }: UpdateCategoryFilterDTO) {
        return prismaClient.categoryFilter.update({
            where: { id },
            data: rest
        });
    }

    async delete(id: string) {
        return prismaClient.categoryFilter.delete({
            where: { id }
        });
    }
}

export { CategoryFilterService };