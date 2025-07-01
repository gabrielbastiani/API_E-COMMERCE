import prismaClient from "../../prisma";

export interface BuyTogetherDetail {
  id: string;
  name: string;
  status: string;
  products: Array<{
    id: string;
    name: string;
    price_per: number;
    imageUrl: string;   // URL da imagem primária
  }>;
  created_at: Date;
}

export class FindUniqueBuyTogetherService {
  async execute(id: string): Promise<BuyTogetherDetail | null> {
    // 1) Busca o grupo puro, sem include de produtos relacionais
    const bt = await prismaClient.buyTogether.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        status: true,
        products: true,        // array JSON de IDs
        created_at: true
      }
    });
    if (!bt) return null;

    // 2) Extrai IDs do JSON
    const ids = Array.isArray(bt.products) ? (bt.products as string[]) : [];

    // 3) Busca detalhes dos produtos
    const prods = ids.length
      ? await prismaClient.product.findMany({
          where: { id: { in: ids } },
          select: {
            id: true,
            name: true,
            price_per: true,
            images: {
              where: { isPrimary: true },
              select: { url: true }
            }
          }
        })
      : [];

    // 4) Mapeia para o formato leve
    const products = prods.map((p) => ({
      id: p.id,
      name: p.name,
      price_per: p.price_per,
      imageUrl: p.images[0]?.url || ""   // pega a primária
    }));

    return {
      id: bt.id,
      name: bt.name || "",
      status: bt.status,
      created_at: bt.created_at,
      products
    };
  }
}
