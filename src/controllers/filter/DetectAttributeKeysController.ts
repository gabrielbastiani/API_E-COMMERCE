import { Request, Response, NextFunction } from 'express';
import prisma from '../../prisma';

/**
 * Controller que retorna chaves (keys) dos atributos das variantes
 * para as categorias informadas (categoryIds ou category_slugs).
 *
 * Query params aceitos:
 * - category_id (único) ou category_ids (CSV)  -> preferível passar array
 * - slug (único) ou slugs (CSV)
 *
 * Resposta:
 * { keys: string[], keysWithCounts: { key: string, count: number }[] }
 */
export class DetectAttributeKeysController {
  async handle(req: Request, res: Response, next: NextFunction) {
    try {
      // suportar category ids ou slugs
      const { category_id, category_ids, slugs, slug } = req.query;

      let categoryIds: string[] = [];
      if (category_id) categoryIds = [String(category_id)];
      else if (category_ids) categoryIds = String(category_ids).split(',').map(s => s.trim()).filter(Boolean);

      let slugsArr: string[] = [];
      if (slug) slugsArr = [String(slug)];
      else if (slugs) slugsArr = String(slugs).split(',').map(s => s.trim()).filter(Boolean);

      // se vier slugs, converter para ids
      if (slugsArr.length > 0) {
        const cats = await prisma.category.findMany({
          where: { slug: { in: slugsArr } },
          select: { id: true },
        });
        categoryIds = [...categoryIds, ...cats.map(c => c.id)];
      }

      if (categoryIds.length === 0) {
        res.status(400).json({ error: 'category_id ou slug(s) são necessários' });
      }

      // Buscar keys distintas de variantAttribute para produtos que pertencem às categorias
      // Observação: assumimos model VariantAttribute com campos 'key' e 'value' e relação Variant -> Product -> ProductCategories -> Category
      const keys = await prisma.variantAttribute.findMany({
        where: {
          variant: {
            product: {
              categories: { some: { category_id: { in: categoryIds } } } // ajuste conforme seu schema: categoryId vs category.id
            }
          }
        },
        distinct: ['key'],
        select: { key: true },
        orderBy: { key: 'asc' as const },
      });

      const keysList = keys.map((k: { key: any; }) => k.key).filter(Boolean);

      // Opcional: também enviar counts (quantas vezes aparece cada key)
      const aggregate = await prisma.variantAttribute.groupBy({
        by: ['key'],
        where: {
          variant: {
            product: {
              categories: { some: { category_id: { in: categoryIds } } }
            }
          }
        },
        _count: { key: true },
        orderBy: { _count: { key: 'desc' as const } },
      });

      const keysWithCounts = aggregate.map((a: { key: any; _count: { key: any; }; }) => ({ key: a.key, count: a._count.key }));

      res.json({ keys: keysList, keysWithCounts });
    } catch (err) {
      next(err);
    }
  }
}