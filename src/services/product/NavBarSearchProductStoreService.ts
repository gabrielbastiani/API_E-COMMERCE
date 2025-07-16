import { PrismaClient, Prisma } from "@prisma/client";
const prisma = new PrismaClient();

export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
}

export interface SearchOptions {
  term: string;
  page?: number;
  perPage?: number;
}

export interface ProductWithRelations {
  id: string;
  name: string;
  slug: string | null;
  description: string;
  price_per: number;
  images: { url: string }[];
  brand: string | null;
  categories: { category: { id: string; name: string } }[];
  variants: {
    id: string;
    sku: string;
    price_per: number;
    variantAttribute: { key: string; value: string }[];
  }[];
}

export async function searchProducts({
  term,
  page = 1,
  perPage = 20,
}: SearchOptions): Promise<SearchResult<ProductWithRelations>> {
  const searchTerm = term.trim();

  // cláusula WHERE dinâmica combinando vários campos e relações
  const where: Prisma.ProductWhereInput = {
    OR: [
      { name: { contains: searchTerm, mode: "insensitive" } },
      { slug: { contains: searchTerm, mode: "insensitive" } },
      { brand: { contains: searchTerm, mode: "insensitive" } },
      {
        keywords: {
          array_contains: [searchTerm], // se keywords for Json[] de strings
        } as any,
      },
      {
        variants: {
          some: {
            OR: [
              { sku: { contains: searchTerm, mode: "insensitive" } },
              {
                variantAttribute: {
                  some: {
                    value: { contains: searchTerm, mode: "insensitive" },
                  },
                },
              },
            ],
          },
        },
      },
      {
        categories: {
          some: {
            category: {
              name: { contains: searchTerm, mode: "insensitive" },
            },
          },
        },
      },
    ],
    status: "DISPONIVEL",
  };

  // total de correspondências
  const total = await prisma.product.count({ where });

  // buscar página
  const items = await prisma.product.findMany({
    where,
    skip: (page - 1) * perPage,
    take: perPage,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      price_per: true,
      brand: true,
      images: { select: { url: true } },
      categories: {
        select: {
          category: { select: { id: true, name: true } },
        },
      },
      variants: {
        select: {
          id: true,
          sku: true,
          price_per: true,
          variantAttribute: { select: { key: true, value: true } },
        },
      },
    },
  });

  return {
    items: items as ProductWithRelations[],
    total,
    page,
    perPage,
  };
}