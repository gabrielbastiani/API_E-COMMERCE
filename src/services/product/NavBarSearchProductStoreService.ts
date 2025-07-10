import prismaClient from "../../prisma";
import { Prisma, StatusProduct } from "@prisma/client";

class NavBarSearchProductStoreService {
  async execute(
    search: string = ""
  ) {
    const whereClause: Prisma.ProductWhereInput = {
      status: StatusProduct.DISPONIVEL,
      ...(
        search ? {
          OR: [
            { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { brand: { contains: search, mode: Prisma.QueryMode.insensitive } },
          ]
        } : {}
      )
    };

    const all_products = await prismaClient.product.findMany({
      where: whereClause,
      include: {
        categories: {
          include: {
            category: true
          }
        },
        images: true
      }
    });

    return all_products;

  }
}

export { NavBarSearchProductStoreService };