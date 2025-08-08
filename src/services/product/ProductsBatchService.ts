import prismaClient from "../../prisma";

interface BatchRequest {
  ids: string[]; // ordem desejada
}

class ProductsBatchService {
  async execute({ ids }: BatchRequest) {
    if (!Array.isArray(ids) || ids.length === 0) return [];

    // busca todos de uma vez (status DISPONIVEL)
    const products = await prismaClient.product.findMany({
      where: {
        id: { in: ids },
        status: "DISPONIVEL",
      },
      include: {
        images: true,
        variants: {
          include: {
            productVariantImage: true,
            variantAttribute: {
              include: {
                variantAttributeImage: true,
              },
            },
            mainPromotion: true,
          },
        },
        productsDescriptions: true,
      },
    });

    // mapear por id e devolver na mesma ordem dos ids recebidos
    const mapById = new Map(products.map(p => [p.id, p]));
    return ids.map(id => mapById.get(id)).filter(Boolean);
  }
}

export { ProductsBatchService };