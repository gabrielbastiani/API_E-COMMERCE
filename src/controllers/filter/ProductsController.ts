import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import prismaClient from "../../prisma";

function parseFiltersParam(raw: any): Record<string, string[]> {
  if (!raw) return {};
  try {
    // se já for objeto, retorne
    if (typeof raw === "object") return raw;
    let s = String(raw);
    // tentar JSON direto
    try {
      return JSON.parse(s);
    } catch { /* continue */ }

    // tentar decodeURIComponent (é comum estar codificado)
    try {
      const dec = decodeURIComponent(s);
      return JSON.parse(dec);
    } catch { /* continue */ }

    // tentar duas vezes decode (double-encoded)
    try {
      const dec2 = decodeURIComponent(decodeURIComponent(s));
      return JSON.parse(dec2);
    } catch { /* continue */ }

    // fallback: retorna vazio
    return {};
  } catch {
    return {};
  }
}

function mapRatingNumberToEnum(n: number) {
  const map: any = { 1: "ONE", 2: "TWO", 3: "THREE", 4: "FOUR", 5: "FIVE" };
  return map[n] ?? null;
}

/**
 * Constrói where a partir do mapa filters: { filterId: [valueId, ...], ... }
 * - Valores "key::value" são interpretados como atributo chave/valor
 * - OR entre opções do mesmo filtro; AND entre filtros distintos
 */
async function buildWhereFromFilters(filters: Record<string, string[]>, productIdsAllowed?: string[]): Promise<Prisma.ProductWhereInput> {
  const andClauses: Prisma.ProductWhereInput[] = [];

  const filterIds = Object.keys(filters);
  if (filterIds.length === 0) {
    return productIdsAllowed && productIdsAllowed.length ? { id: { in: productIdsAllowed } } : {};
  }

  // carregar defs das filters
  const defs = await prismaClient.filter.findMany({
    where: { id: { in: filterIds } }
  });
  const defsById = new Map(defs.map(d => [d.id, d]));

  for (const fid of filterIds) {
    const selected = filters[fid] ?? [];
    if (!selected || selected.length === 0) continue;
    const def = defsById.get(fid);
    if (!def) continue;

    const field = (def.fieldName ?? "").toLowerCase();

    // para cada filtro, construiremos um array de cláusulas que serão ORed
    const orForThisFilter: Prisma.ProductWhereInput[] = [];

    // RANGE
    if (def.type === "RANGE") {
      const min = selected[0] ? Number(selected[0]) : null;
      const max = selected[1] ? Number(selected[1]) : null;
      if (min !== null || max !== null) {
        if (field.includes("price") || field === "price_per") {
          const clause: any = {};
          if (min !== null) clause.gte = min;
          if (max !== null) clause.lte = max;
          orForThisFilter.push({ price_per: clause } as any);
        } else if (field.includes("variant")) {
          const clause: any = {};
          if (min !== null) clause.gte = min;
          if (max !== null) clause.lte = max;
          orForThisFilter.push({ variants: { some: { price_per: clause } } } as any);
        } else {
          const safeField = String(def.fieldName ?? "").replace(/[^a-zA-Z0-9_]/g, "");
          const clause: any = {};
          if (min !== null) clause.gte = min;
          if (max !== null) clause.lte = max;
          orForThisFilter.push({ [safeField]: clause } as any);
        }
      }
      // push OR (even if single) to AND
      if (orForThisFilter.length > 0) andClauses.push({ OR: orForThisFilter } as any);
      continue;
    }

    // process selected values
    const plainVals: string[] = [];
    const attrValueGroups: Array<{ key: string; value: string }> = [];

    for (const sv of selected) {
      if (String(sv).includes("::")) {
        const [k, ...rest] = String(sv).split("::");
        const v = rest.join("::");
        if (k && v) attrValueGroups.push({ key: k, value: v });
        else plainVals.push(String(sv));
      } else {
        plainVals.push(String(sv));
      }
    }

    // handle attribute groups: each selected leads to a clause that checks productCharacteristics OR variantAttribute
    for (const ag of attrValueGroups) {
      const clause: Prisma.ProductWhereInput = {
        OR: [
          { productCharacteristics: { some: { AND: [{ key: ag.key }, { value: ag.value }] } } } as any,
          { variants: { some: { variantAttribute: { some: { AND: [{ key: ag.key }, { value: ag.value }] } } } } } as any
        ]
      };
      orForThisFilter.push(clause);
    }

    // handle plain values according to field
    if (plainVals.length > 0) {
      if (field === "brand") {
        orForThisFilter.push({ brand: { in: plainVals } } as any);
      } else if (field.includes("sku")) {
        orForThisFilter.push({ variants: { some: { sku: { in: plainVals } } } } as any);
      } else if (field.includes("rating") || /avali/i.test(def.name ?? "")) {
        const enumVals = plainVals.map(s => {
          const num = Number(s);
          return mapRatingNumberToEnum(num);
        }).filter(Boolean);
        if (enumVals.length > 0) orForThisFilter.push({ reviews: { some: { rating: { in: enumVals as any } } } } as any);
      } else if (field.includes("productcharacter") || field.includes("characteristic")) {
        if (Array.isArray(def.attributeKeys) && def.attributeKeys.length > 0) {
          orForThisFilter.push({
            productCharacteristics: {
              some: {
                AND: [
                  { key: { in: def.attributeKeys } },
                  { value: { in: plainVals } }
                ]
              }
            }
          } as any);
        } else {
          orForThisFilter.push({ productCharacteristics: { some: { value: { in: plainVals } } } } as any);
        }
      } else if (field.includes("variantattribute") || field.includes("variant")) {
        if (Array.isArray(def.attributeKeys) && def.attributeKeys.length > 0) {
          orForThisFilter.push({
            variants: {
              some: {
                variantAttribute: {
                  some: {
                    AND: [
                      { key: { in: def.attributeKeys } },
                      { value: { in: plainVals } }
                    ]
                  }
                }
              }
            }
          } as any);
        } else {
          orForThisFilter.push({
            variants: {
              some: { variantAttribute: { some: { value: { in: plainVals } } } }
            }
          } as any);
        }
      } else {
        const safeField = String(def.fieldName ?? "").replace(/[^a-zA-Z0-9_]/g, "");
        if (safeField) orForThisFilter.push({ [safeField]: { in: plainVals } } as any);
      }
    }

    // if we built any OR clauses for this filter, add to AND
    if (orForThisFilter.length > 0) {
      andClauses.push({ OR: orForThisFilter } as any);
    }
  } // end for filters

  const base: any = {};
  if (productIdsAllowed && productIdsAllowed.length > 0) base.id = { in: productIdsAllowed };
  if (andClauses.length === 0) return base;
  return { AND: [base, ...andClauses] };
}

export const searchProducts = async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q ?? "").trim();
    const page = Number(req.query.page ?? 1);
    const perPage = Number(req.query.perPage ?? 12);
    const sort = String(req.query.sort ?? "");

    const filtersRaw = req.query.filters ?? req.body?.filters;
    const filtersMap = parseFiltersParam(filtersRaw);

    // first narrow by q
    const productWhere = q ? {
      OR: [
        { name: { contains: q, mode: "insensitive" as Prisma.QueryMode } },
        { description: { contains: q, mode: "insensitive" as Prisma.QueryMode } },
        { skuMaster: { contains: q, mode: "insensitive" as Prisma.QueryMode } }
      ]
    } : undefined;

    const matchingProducts = await prismaClient.product.findMany({
      where: productWhere,
      select: { id: true },
      take: 5000
    });
    const productIds = matchingProducts.map(p => p.id);

    // build where using filters (and restrict to productIds)
    const where = await buildWhereFromFilters(filtersMap, productIds.length ? productIds : undefined);

    // ensure only available products
    (where as any).status = "DISPONIVEL";

    const total = await prismaClient.product.count({ where });

    const orderBy: any[] = [];
    if (sort === "menor") orderBy.push({ price_per: "asc" });
    else if (sort === "maior") orderBy.push({ price_per: "desc" });
    else if (sort === "nomeAsc") orderBy.push({ name: "asc" });
    else if (sort === "nomeDesc") orderBy.push({ name: "desc" });

    const items = await prismaClient.product.findMany({
      where,
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy: orderBy.length ? orderBy : undefined,
      include: {
        images: true,
        variants: {
          include: {
            productVariantImage: true,
            variantAttribute: true
          }
        },
        productCharacteristics: true,
        reviews: true
      }
    });

    res.json({ data: items, meta: { total, page, perPage } });
  } catch (err) {
    console.error("[searchProducts] error", err);
    res.status(500).json({ error: "Erro na busca de produtos" });
  }
};