import { Request, Response, NextFunction } from 'express';
import prisma from '../../prisma';

export class DetectAttributeKeysController {
  async handle(req: Request, res: Response, next: NextFunction) {
    try {
      // --- 1) parse incoming category identifiers (support GET/POST)
      const body = req.body ?? {};
      const query = req.query ?? {};

      // prefer body.categoryIds (POST)
      let categoryIds: string[] = [];
      if (Array.isArray(body.categoryIds) && body.categoryIds.length > 0) {
        categoryIds = body.categoryIds.map(String);
      } else if (body.categoryIds && typeof body.categoryIds === 'string') {
        // allow JSON-stringified array or CSV
        try {
          const parsed = JSON.parse(body.categoryIds);
          if (Array.isArray(parsed)) categoryIds = parsed.map(String);
        } catch {
          categoryIds = body.categoryIds.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      } else {
        // fallback to query params (existing behavior)
        const { category_id, category_ids, slugs, slug } = query as any;

        if (category_id) categoryIds = [String(category_id)];
        else if (category_ids) categoryIds = String(category_ids).split(',').map((s: string) => s.trim()).filter(Boolean);

        // handle slugs -> convert to ids below
        let slugsArr: string[] = [];
        if (slug) slugsArr = [String(slug)];
        else if (slugs) slugsArr = String(slugs).split(',').map((s: string) => s.trim()).filter(Boolean);

        if (slugsArr.length > 0) {
          const cats = await prisma.category.findMany({
            where: { slug: { in: slugsArr } },
            select: { id: true },
          });
          if (cats && cats.length > 0) {
            categoryIds = [...categoryIds, ...cats.map(c => c.id)];
          }
        }
      }

      // If still empty -> bad request
      if (!categoryIds || categoryIds.length === 0) {
        res.status(400).json({ error: 'category_id, category_ids or slug(s) or body.categoryIds são necessários' });
      }

      // --- 2) parse source param (body or query), default 'both' ---
      const sourceRaw = (body.source as string) ?? (query.source as string) ?? 'both';
      const source = ['variant', 'productCharacteristic', 'both'].includes(String(sourceRaw)) ? String(sourceRaw) : 'both';

      // --- 3) prepare results containers ---
      const variantKeysSet = new Set<string>();
      const pcKeysSet = new Set<string>();
      const countsMap = new Map<string, number>();

      // Helper: increase count
      const addCount = (key: string, n = 1) => countsMap.set(key, (countsMap.get(key) ?? 0) + n);

      // --- 4) fetch variant attribute keys/counts when requested ---
      let variantKeysList: string[] = [];
      let variantCounts: Array<{ key: string, count: number }> = [];
      if (source === 'variant' || source === 'both') {
        // distinct keys
        const vkeys = await prisma.variantAttribute.findMany({
          where: {
            variant: { product: { categories: { some: { category: { id: { in: categoryIds } } } } } }
          },
          distinct: ['key'],
          select: { key: true },
          orderBy: { key: 'asc' as const },
        });
        variantKeysList = vkeys.map(k => String(k.key)).filter(Boolean);
        variantKeysList.forEach(k => variantKeysSet.add(k));

        // aggregate counts (groupBy)
        try {
          const agg = await prisma.variantAttribute.groupBy({
            by: ['key'],
            where: {
              variant: { product: { categories: { some: { category: { id: { in: categoryIds } } } } } }
            },
            _count: { key: true },
            orderBy: { _count: { key: 'desc' as const } },
          });
          variantCounts = agg.map(a => ({ key: String(a.key), count: a._count.key ?? 0 }));
          for (const c of variantCounts) addCount(c.key, c.count);
        } catch (err) {
          // groupBy may throw in some prisma/postgres combinations; fall back to counting by querying keys
          // fallback: count occurrences using simple query (slower)
          try {
            const raw = await prisma.$queryRawUnsafe(`
              SELECT "key", COUNT(*) as cnt
              FROM "VariantAttribute" va
              JOIN "ProductVariant" pv ON pv.id = va."variantId"
              JOIN "Product" p ON p.id = pv."productId"
              JOIN "ProductCategories" pc ON pc."product_id" = p.id
              WHERE pc."category_id" = ANY($1::uuid[])
              GROUP BY "key"
            `, categoryIds);
            if (Array.isArray(raw)) {
              for (const r of raw) {
                const k = String(r.key);
                const cnt = Number(r.cnt ?? 0);
                addCount(k, cnt);
                variantKeysSet.add(k);
              }
            }
          } catch (err2) {
            // swallow, we'll just not have counts
            console.warn('variant groupBy fallback failed', err2);
          }
        }
      }

      // --- 5) fetch productCharacteristic keys/counts when requested ---
      let pcKeysList: string[] = [];
      let pcCounts: Array<{ key: string, count: number }> = [];
      if (source === 'productCharacteristic' || source === 'both') {
        const pcks = await prisma.productCharacteristics.findMany({
          where: {
            product: { categories: { some: { category: { id: { in: categoryIds } } } } }
          },
          distinct: ['key'],
          select: { key: true },
          orderBy: { key: 'asc' as const },
        });
        pcKeysList = pcks.map(k => String(k.key)).filter(Boolean);
        pcKeysList.forEach(k => pcKeysSet.add(k));

        try {
          const agg = await prisma.productCharacteristics.groupBy({
            by: ['key'],
            where: {
              product: { categories: { some: { category: { id: { in: categoryIds } } } } }
            },
            _count: { key: true },
            orderBy: { _count: { key: 'desc' as const } },
          });
          pcCounts = agg.map(a => ({ key: String(a.key), count: a._count.key ?? 0 }));
          for (const c of pcCounts) addCount(c.key, c.count);
        } catch (err) {
          // fallback count strategy (best-effort)
          try {
            const raw = await prisma.$queryRawUnsafe(`
              SELECT "key", COUNT(*) as cnt
              FROM "ProductCharacteristics" pc
              JOIN "Product" p ON p.id = pc."product_id"
              JOIN "ProductCategories" pct ON pct."product_id" = p.id
              WHERE pct."category_id" = ANY($1::uuid[])
              GROUP BY "key"
            `, categoryIds);
            if (Array.isArray(raw)) {
              for (const r of raw) {
                const k = String(r.key);
                const cnt = Number(r.cnt ?? 0);
                addCount(k, cnt);
                pcKeysSet.add(k);
              }
            }
          } catch (err2) {
            console.warn('productCharacteristic groupBy fallback failed', err2);
          }
        }
      }

      // --- 6) combine results ---
      const combinedSet = new Set<string>();
      if (source === 'variant' || source === 'both') for (const k of variantKeysSet) combinedSet.add(k);
      if (source === 'productCharacteristic' || source === 'both') for (const k of pcKeysSet) combinedSet.add(k);

      const keys = Array.from(combinedSet).sort((a, b) => a.localeCompare(b));

      // convert countsMap to sorted array
      const keysWithCounts = Array.from(countsMap.entries())
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));

      // optional detailed lists (useful for debugging/clients)
      const details: any = {};
      if (source === 'variant' || source === 'both') details.variantKeys = variantKeysList;
      if (source === 'productCharacteristic' || source === 'both') details.productCharacteristicKeys = pcKeysList;

      res.json({ source, keys, keysWithCounts, details });
    } catch (err) {
      console.error('DetectAttributeKeysController error', err);
      next(err);
    }
  }
}