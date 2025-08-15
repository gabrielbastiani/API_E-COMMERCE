import { Request, Response } from 'express';
import {
  getCategoryBySlug,
  getProductsByCategorySlug,
  getFiltersForCategory
} from '../../../services/product/categoryProduct/category.service';

export async function listProductsByCategory(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    if (!slug) {
      if (!res.headersSent) res.status(400).json({ error: 'slug da categoria é necessário' });
      return;
    }

    const page = req.query.page ? Number(req.query.page) : 1;
    const perPage = req.query.perPage ? Number(req.query.perPage) : 12;
    const q = req.query.q ? String(req.query.q) : undefined;
    const brand = req.query.brand ? String(req.query.brand) : undefined;
    const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;
    const sort = req.query.sort ? String(req.query.sort) as any : undefined;

    let filters = undefined;
    if (req.query.filters) {
      try {
        filters = typeof req.query.filters === 'string' ? JSON.parse(String(req.query.filters)) : req.query.filters;
      } catch (err) {
        if (!res.headersSent) res.status(400).json({ error: 'filters deve ser um JSON válido' });
        return;
      }
    }

    const category = await getCategoryBySlug(slug);
    if (!category) {
      if (!res.headersSent) res.status(404).json({ error: 'Categoria não encontrada' });
      return;
    }

    const resp = await getProductsByCategorySlug(slug, {
      page,
      perPage,
      q,
      brand,
      minPrice,
      maxPrice,
      sort,
      filters,
    });

    if (!res.headersSent) res.json(resp);
    return;
  } catch (err) {
    console.error('listProductsByCategory error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Erro interno' });
    return;
  }
}

export async function listFiltersByCategory(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    if (!slug) {
      if (!res.headersSent) res.status(400).json({ error: 'slug da categoria é necessário' });
      return;
    }

    const category = await getCategoryBySlug(slug);
    if (!category) {
      if (!res.headersSent) res.status(404).json({ error: 'Categoria não encontrada' });
      return;
    }

    const filters = await getFiltersForCategory(slug);

    if (!res.headersSent) res.json({ filters });
    return;
  } catch (err) {
    console.error('listFiltersByCategory error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Erro interno' });
    return;
  }
}