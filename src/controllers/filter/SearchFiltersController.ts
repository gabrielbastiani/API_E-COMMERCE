import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import prismaClient from "../../prisma";

function normalizeVal(v: any) {
  return String(v ?? "").trim().toLowerCase();
}

function buildProductWhereFromQuery(q?: string): Prisma.ProductWhereInput | undefined {
  if (!q || !String(q).trim()) return undefined;
  const term = String(q).trim();
  return {
    OR: [
      { name: { contains: term, mode: "insensitive" as Prisma.QueryMode } },
      { description: { contains: term, mode: "insensitive" as Prisma.QueryMode } },
      { skuMaster: { contains: term, mode: "insensitive" as Prisma.QueryMode } }
    ]
  };
}

/**
 * GET /filters/search?q=...
 * Retorna somente filtros marcados forSearch = true,
 * popula opções a partir dos produtos que batem com a query,
 * normaliza e deduplica opções.
 */
export const getSearchFilters = async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q ?? "").trim();

    const filters = await prismaClient.filter.findMany({
      where: { isActive: true, forSearch: true },
      include: { group: true },
      orderBy: { order: "asc" }
    });

    const productWhere = buildProductWhereFromQuery(q);
    const matchingProducts = await prismaClient.product.findMany({
      where: productWhere,
      select: { id: true },
      take: 5000
    });
    const productIds = matchingProducts.map(p => p.id);

    const out: any[] = [];

    for (const f of filters) {
      const field = (f.fieldName ?? "").toLowerCase();
      let options: any[] = [];
      let minValue: number | null = null;
      let maxValue: number | null = null;
      let reviewSummary: any = null;

      // RANGE population (ex.: price)
      if (f.type === "RANGE" && f.dataType === "NUMBER") {
        if (field.includes("price")) {
          const agg = await prismaClient.product.aggregate({
            _min: { price_per: true },
            _max: { price_per: true },
            where: productIds.length ? { id: { in: productIds } } : undefined
          });
          minValue = agg._min.price_per ?? null;
          maxValue = agg._max.price_per ?? null;
        } else if (field.includes("variant")) {
          const agg = await prismaClient.productVariant.aggregate({
            _min: { price_per: true },
            _max: { price_per: true },
            where: productIds.length ? { product_id: { in: productIds } } : undefined
          });
          minValue = agg._min.price_per ?? null;
          maxValue = agg._max.price_per ?? null;
        }
      }

      // OPTIONS / SELECT / MULTI_SELECT
      if (f.type === "SELECT" || f.type === "MULTI_SELECT" || f.autoPopulate) {
        // BRAND
        if (field === "brand") {
          const rows = await prismaClient.product.findMany({
            where: productIds.length ? { id: { in: productIds }, brand: { not: null } } : { brand: { not: null } },
            select: { brand: true },
            distinct: ["brand"],
            take: 500
          });
          const map = new Map<string, any>();
          for (const r of rows) {
            const val = r.brand;
            if (!val) continue;
            const key = normalizeVal(val);
            if (!map.has(key)) map.set(key, { id: val, label: val, value: val, count: 1 });
            else map.get(key).count++;
          }
          options = Array.from(map.values());
        }
        // SKU variants
        else if (field.includes("sku")) {
          const rows = await prismaClient.productVariant.findMany({
            where: productIds.length ? { product_id: { in: productIds } } : undefined,
            select: { sku: true },
            distinct: ["sku"],
            take: 1000
          });
          const map = new Map<string, any>();
          for (const r of rows) {
            if (!r.sku) continue;
            const key = normalizeVal(r.sku);
            if (!map.has(key)) map.set(key, { id: r.sku, label: r.sku, value: r.sku, count: 1 });
            else map.get(key).count++;
          }
          options = Array.from(map.values());
        }
        // productCharacteristics
        else if (field.includes("productcharacter") || field.includes("characteristic")) {
          const attrKeys = Array.isArray(f.attributeKeys) && f.attributeKeys.length > 0 ? f.attributeKeys : undefined;
          const whereClause: any = {};
          if (productIds.length) whereClause.product_id = { in: productIds };
          if (attrKeys) whereClause.key = { in: attrKeys };
          const rows = await prismaClient.productCharacteristics.findMany({
            where: whereClause,
            select: { key: true, value: true },
            take: 2000
          });
          const map = new Map<string, any>();
          for (const r of rows) {
            if (!r.value) continue;
            const id = `${r.key}::${r.value}`;
            const keyNorm = normalizeVal(id);
            if (!map.has(keyNorm)) map.set(keyNorm, { id, label: String(r.value), value: r.value, metaKey: r.key, count: 1 });
            else map.get(keyNorm).count++;
          }
          options = Array.from(map.values());
        }
        // variant attributes
        else if (field.includes("variantattribute") || field.includes("variant")) {
          const rows = await prismaClient.variantAttribute.findMany({
            where: productIds.length ? { variant: { product_id: { in: productIds } } } : undefined,
            select: { key: true, value: true },
            take: 3000
          });
          const map = new Map<string, any>();
          for (const r of rows) {
            if (!r.value) continue;
            const id = `${r.key}::${r.value}`;
            const keyNorm = normalizeVal(id);
            if (!map.has(keyNorm)) map.set(keyNorm, { id, label: String(r.value), value: r.value, metaKey: r.key, count: 1 });
            else map.get(keyNorm).count++;
          }
          options = Array.from(map.values());
        } else {
          // fallback: distinct values from product column (dangerous fallback)
          const safeColumn = (f.fieldName ?? "").replace(/[^a-zA-Z0-9_]/g, "");
          if (safeColumn) {
            try {
              const rows: any[] = await prismaClient.$queryRawUnsafe(`
                SELECT DISTINCT "${safeColumn}" as val
                FROM "products"
                WHERE ${productIds.length ? `id IN (${productIds.map(id => `'${id}'`).join(",")}) AND ` : ""} "${safeColumn}" IS NOT NULL
                LIMIT 500
              `);
              const map = new Map<string, any>();
              for (const r of rows) {
                const v = r.val;
                if (!v) continue;
                const keyNorm = normalizeVal(v);
                if (!map.has(keyNorm)) map.set(keyNorm, { id: v, label: String(v), value: v, count: 1 });
                else map.get(keyNorm).count++;
              }
              options = Array.from(map.values());
            } catch (err) {
              console.warn("fallback distinct failed for", safeColumn, err);
            }
          }
        }
      } // end options population

      // review summary (rating)
      if ((f.fieldName && f.fieldName.toLowerCase().includes("rating")) || (f.name && /avali/i.test(String(f.name)))) {
        try {
          const countsRaw: any[] = await prismaClient.$queryRawUnsafe(`
            SELECT rating, COUNT(1) as cnt
            FROM "reviews"
            ${productIds.length ? `WHERE product_id IN (${productIds.map(id => `'${id}'`).join(",")})` : ""}
            GROUP BY rating
          `);
          const counts: Record<string, number> = {};
          let sum = 0;
          let total = 0;
          const mapEnumToNum: any = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
          for (const r of countsRaw) {
            counts[String(r.rating)] = Number(r.cnt ?? 0);
            const num = mapEnumToNum[String(r.rating)] ?? 0;
            sum += num * Number(r.cnt ?? 0);
            total += Number(r.cnt ?? 0);
          }
          reviewSummary = { avgRating: total ? sum / total : 0, countsByRating: counts };
        } catch (err) {
          console.warn("review summary aggregation failed", err);
        }
      }

      // dedupe
      if (Array.isArray(options) && options.length > 0) {
        const seen = new Map<string, any>();
        for (const o of options) {
          const key = normalizeVal(o.id ?? o.value ?? o.label ?? "");
          if (!seen.has(key)) seen.set(key, o);
          else {
            const existing = seen.get(key);
            if (existing.count && o.count) existing.count += o.count;
          }
        }
        options = Array.from(seen.values());
      }

      out.push({
        id: f.id,
        name: f.name,
        fieldName: f.fieldName,
        type: f.type,
        displayStyle: f.displayStyle,
        dataType: f.dataType,
        options,
        minValue,
        maxValue,
        group: f.group ? { id: f.group.id, name: f.group.name } : null,
        reviewSummary
      });
    }

    // group by group.id
    const grouped = new Map<string, any>();
    for (const it of out) {
      const gid = it.group ? it.group.id : "ungrouped";
      if (!grouped.has(gid)) grouped.set(gid, { group: it.group, filters: [] });
      grouped.get(gid).filters.push(it);
    }
    const groups = Array.from(grouped.values());

    res.json({ groups });
  } catch (err) {
    console.error("getSearchFilters error", err);
    res.status(500).json({ error: "Erro ao buscar filtros" });
  }
};