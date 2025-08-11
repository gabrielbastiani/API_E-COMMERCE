import prismaClient from "../../prisma";

interface LookupRequest {
    productIds?: string[];
    variantIds?: string[];
}

class LookupService {
    async execute({ productIds = [], variantIds = [] }: LookupRequest) {
        const pIds = Array.isArray(productIds) ? productIds.filter(Boolean) : [];
        const vIds = Array.isArray(variantIds) ? variantIds.filter(Boolean) : [];

        if (pIds.length === 0 && vIds.length === 0) {
            return { products: [], variants: [] };
        }

        // tente buscar em paralelo — caso o DB esteja offline, o erro sobe para o controller
        const [productsRaw, variantsRaw] = await Promise.all([
            pIds.length > 0
                ? prismaClient.product.findMany({
                    where: { id: { in: pIds } },
                    select: { id: true, name: true },
                })
                : Promise.resolve([]),
            vIds.length > 0
                ? prismaClient.productVariant.findMany({
                    where: { id: { in: vIds } },
                    select: { id: true, sku: true },
                })
                : Promise.resolve([]),
        ]);

        const prodMap = new Map<string, { id: string; name?: string | null }>();
        (productsRaw || []).forEach((p: any) => prodMap.set(p.id, { id: p.id, name: p.name ?? null }));

        const varMap = new Map<string, { id: string; sku?: string | null; name?: string | null }>();
        (variantsRaw || []).forEach((v: any) => varMap.set(v.id, { id: v.id, sku: v.sku ?? null, name: v.name ?? null }));

        const products = pIds.map((id) => prodMap.get(id)).filter(Boolean) as Array<{ id: string; name?: string | null }>;
        const variants = vIds.map((id) => varMap.get(id)).filter(Boolean) as Array<{ id: string; sku?: string | null; name?: string | null }>;

        return { products, variants };
    }
}

export { LookupService };