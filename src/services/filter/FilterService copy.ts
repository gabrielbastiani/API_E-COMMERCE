import { Prisma } from "@prisma/client";
import prismaClient from "../../prisma";


interface CreateFilterDTO {
  name: string;
  fieldName?: string | null;
  type: string;
  dataType?: string | null;
  displayStyle?: string | null;
  isActive?: boolean;
  order?: number;
  autoPopulate?: boolean;
  minValue?: number | null;
  maxValue?: number | null;
  groupId?: string | null;
  // attributeKeys stored as JSON in DB
  attributeKeys?: string[] | null;
  options?: Array<any>;
}

interface UpdateFilterDTO extends Partial<CreateFilterDTO> {
  id: string;
}

class FilterService {
  async create(data: CreateFilterDTO) {
    const {
      attributeKeys,
      options,
      groupId,
      ...rest
    } = data;

    // build data object carefully so prisma typings accept null vs undefined
    const payload: Record<string, any> = { ...rest };

    // groupId: allow explicit null (set null) or undefined (omit)
    if (Object.prototype.hasOwnProperty.call(data, "groupId")) {
      // if provided and null -> set null; if provided string -> set that string
      payload.groupId = groupId === null ? null : groupId;
    }

    // attributeKeys is JSON column in schema
    if (Object.prototype.hasOwnProperty.call(data, "attributeKeys")) {
      // Prisma expects an InputJsonValue; cast ensures TS is happy
      payload.attributeKeys = attributeKeys === null ? null : (attributeKeys as Prisma.InputJsonValue);
    }

    // handle nested options if provided (createMany or connect) - simple create for now
    if (Array.isArray(options) && options.length > 0) {
      // Expect options to be created separately via filterOption endpoints, but if you
      // want nested create you can adapt here. For now we pass options as-is only if DB expects nested create.
      payload.options = options as any;
    }

    const created = await prismaClient.filter.create({
      data: payload as any
    });

    return created;
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

  async update({ id, attributeKeys, options, groupId, ...rest }: UpdateFilterDTO) {
    // build data object conditionally to avoid TS/Prisma mismatches
    const payload: Record<string, any> = { ...rest };

    if (Object.prototype.hasOwnProperty.call(arguments[0], "groupId")) {
      payload.groupId = groupId === null ? null : groupId;
    }

    if (Object.prototype.hasOwnProperty.call(arguments[0], "attributeKeys")) {
      payload.attributeKeys = attributeKeys === null ? null : (attributeKeys as Prisma.InputJsonValue);
    }

    // handle options update: depending on your prisma schema you may want nested writes,
    // e.g. update many/createMany/deleteMany for filterOption. This code assumes you send full options array
    // and backend handles options separately (via FilterOptionService). If you want nested, adapt here.
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

export { FilterService };