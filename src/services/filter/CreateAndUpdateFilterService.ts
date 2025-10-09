import { Prisma } from "@prisma/client";
import prismaClient from "../../prisma"; // ajuste se necessário

interface CreateFilterDTO {
  name: string;
  fieldName?: string | null;
  type: string;
  dataType?: string | null;
  displayStyle?: string | null;
  isActive?: boolean;
  order?: number;
  autoPopulate?: boolean;
  forSearch?: boolean; // ADICIONADO: sinaliza se o filtro aparece na página de busca
  minValue?: number | null;
  maxValue?: number | null;
  groupId?: string | null;
  attributeKeys?: string[] | null;
  options?: Array<any>;
}

interface UpdateFilterDTO extends Partial<CreateFilterDTO> {
  id: string;
}

class CreateAndUpdateFilterService {
  async create(data: CreateFilterDTO) {
    const { attributeKeys, options, groupId, ...rest } = data;

    // build data object carefully so prisma typings accept null vs undefined
    const payload: Record<string, any> = { ...rest };

    // groupId: allow explicit null (set null) or undefined (omit)
    if (Object.prototype.hasOwnProperty.call(data, "groupId")) {
      payload.groupId = groupId === null ? null : groupId;
    }

    // forSearch: copy if provided
    if (Object.prototype.hasOwnProperty.call(data, "forSearch")) {
      payload.forSearch = data.forSearch === null ? null : data.forSearch;
    }

    // attributeKeys is JSON column in schema
    if (Object.prototype.hasOwnProperty.call(data, "attributeKeys")) {
      payload.attributeKeys = attributeKeys === null ? null : (attributeKeys as Prisma.InputJsonValue);
    }

    // handle nested options if provided (createMany or connect) - simple create for now
    if (Array.isArray(options) && options.length > 0) {
      // The DB schema you've shown stores options likely as separate rows — here we simply pass options as JSON if needed.
      payload.options = options as any;
    }

    const created = await prismaClient.filter.create({
      data: payload as any
    });

    return created;
  }

  async findGlobal() {
    return prismaClient.filter.findMany({
      where: { isActive: true },
      include: { group: true },
      orderBy: { order: "asc" },
    });
  }

  async findAll() {
    return prismaClient.filter.findMany({
      include: { group: true },
      orderBy: { order: "asc" }
    });
  }

  async findById(id: string) {
    return prismaClient.filter.findUnique({
      where: { id },
      include: {
        group: true
      }
    });
  }

  async update({ id, attributeKeys, options, groupId, forSearch, ...rest }: UpdateFilterDTO) {
    // build data object conditionally to avoid TS/Prisma mismatches
    const payload: Record<string, any> = { ...rest };

    if (Object.prototype.hasOwnProperty.call(arguments[0], "groupId")) {
      payload.groupId = groupId === null ? null : groupId;
    }

    if (Object.prototype.hasOwnProperty.call(arguments[0], "forSearch")) {
      payload.forSearch = forSearch === null ? null : forSearch;
    }

    if (Object.prototype.hasOwnProperty.call(arguments[0], "attributeKeys")) {
      payload.attributeKeys = attributeKeys === null ? null : (attributeKeys as Prisma.InputJsonValue);
    }

    if (Array.isArray(options)) {
      payload.options = options as any;
    }

    const updated = await prismaClient.filter.update({
      where: { id },
      data: payload as any
    });

    return updated;
  }

  async delete(id: string) {
    return prismaClient.filter.delete({
      where: { id }
    });
  }
}

export { CreateAndUpdateFilterService };