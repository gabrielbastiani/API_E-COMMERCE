import { Request, Response } from 'express';
import { FilterForSearchService } from '../../services/filter/FilterForSearchService';

class FilterForSearchController {
    async getFiltersForSearch(req: Request, res: Response) {
        try {
            const service = new FilterForSearchService();
            const filters = await service.getFiltersForSearch();
            res.json(filters);
        } catch (error) {
            console.error('Error getting search filters:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getAllFiltersForCMS(req: Request, res: Response) {
        try {
            const service = new FilterForSearchService();
            const filters = await service.getAllFiltersForCMS();
            res.json(filters);
        } catch (error) {
            console.error('Error getting all filters for CMS:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async detectAttributeKeysForSearch(req: Request, res: Response) {
        try {
            const service = new FilterForSearchService();
            const keys = await service.detectAttributeKeysForSearch();
            res.json(keys);
        } catch (error) {
            console.error('Error detecting attribute keys for search:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async updateFilterForSearch(req: Request, res: Response) {
        try {
            const { filterId } = req.params;
            const { forSearch } = req.body;

            const service = new FilterForSearchService();
            const updated = await service.updateFilterForSearch(filterId, forSearch);
            res.json(updated);
        } catch (error) {
            console.error('Error updating filter for search:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

export { FilterForSearchController };