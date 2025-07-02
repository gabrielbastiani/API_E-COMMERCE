import prismaClient from "../../prisma";
import {
    FilterType,
    FilterDataType,
    FilterDisplayStyle
} from "@prisma/client";

interface CreateFilterDTO {
    name: string;
    fieldName: string;
    type: FilterType;
    dataType: FilterDataType;
    displayStyle: FilterDisplayStyle;
    isActive?: boolean;
    order?: number;
    autoPopulate?: boolean;
    minValue?: number;
    maxValue?: number;
    groupId?: string;
}

interface UpdateFilterDTO extends Partial<CreateFilterDTO> {
    id: string;
}

class FilterService {
    async create(data: CreateFilterDTO) {
        return prismaClient.filter.create({ data });
    }

    async findAll() {
        return prismaClient.filter.findMany({
            include: { options: true, group: true }
        });
    }

    async findById(id: string) {
        return prismaClient.filter.findUnique({
            where: { id },
            include: { options: true, group: true }
        });
    }

    async update({ id, ...rest }: UpdateFilterDTO) {
        return prismaClient.filter.update({
            where: { id },
            data: rest
        });
    }

    async delete(id: string) {
        return prismaClient.filter.delete({
            where: { id }
        });
    }
}

export { FilterService };