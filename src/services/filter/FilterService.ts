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
    minValue?: number | null;
    maxValue?: number | null;
    groupId?: string | null;
    options?: {
        label: string;
        value: string;
        order?: number;
        iconUrl?: string | null;
        colorCode?: string | null;
        isDefault?: boolean;
    }[];
}

interface UpdateFilterDTO {
    id: string;
    name?: string;
    fieldName?: string;
    type?: FilterType;
    dataType?: FilterDataType;
    displayStyle?: FilterDisplayStyle;
    isActive?: boolean;
    order?: number;
    autoPopulate?: boolean;
    minValue?: number | null;
    maxValue?: number | null;
    groupId?: string | null;
    // NOTE: não incluímos `options` aqui—essas alterações ficam
    // no CRUD separado de filter-options
}

class FilterService {
    async create(data: CreateFilterDTO) {
        const { options, groupId, ...filterData } = data;

        return prismaClient.filter.create({
            data: {
                ...filterData,
                // relaciona Grupo se houver:
                ...(groupId
                    ? { group: { connect: { id: groupId } } }
                    : {}),
                // nested create de opções se houver:
                ...(options && options.length
                    ? {
                        options: {
                            create: options.map(o => ({
                                label: o.label,
                                value: o.value,
                                order: o.order ?? 0,
                                iconUrl: o.iconUrl ?? null,
                                colorCode: o.colorCode ?? null,
                                isDefault: o.isDefault ?? false,
                            }))
                        }
                    }
                    : {})
            },
            include: {
                group: true,
                options: true
            }
        });
    }

    async findAll() {
        return prismaClient.filter.findMany({
            include: {
                group: true,
                options: true
            },
            orderBy: { order: "asc" }
        });
    }

    async findById(id: string) {
        return prismaClient.filter.findUnique({
            where: { id },
            include: {
                group: true,
                options: true
            }
        });
    }

    async update(dto: UpdateFilterDTO) {
        const {
            id,
            groupId,
            // não pegamos `options` aqui
            ...dataFields
        } = dto;

        return prismaClient.filter.update({
            where: { id },
            data: {
                ...dataFields,
                // trata alteração de grupo:
                ...(groupId === undefined
                    ? {} // não mexe no relacionamento
                    : groupId
                        ? { group: { connect: { id: groupId } } }
                        : { group: { disconnect: true } }
                )
            },
            include: {
                group: true,
                options: true
            }
        });
    }

    async delete(id: string) {
        return prismaClient.filter.delete({
            where: { id }
        });
    }
}

export { FilterService };