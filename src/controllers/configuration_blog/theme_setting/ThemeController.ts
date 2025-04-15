import { Request, Response } from 'express';
import { ThemeService } from '../../../services/configuration_blog/ThemeService';
import { validationResult } from 'express-validator/lib/validation-result';

class ThemeController {
    async getTheme(req: Request, res: Response) {
        try {
            const themeService = new ThemeService();
            const colors = await themeService.getThemeSettings();
            return res.json({ colors });
        } catch (error) {
            return res.status(500).json({ error: 'Erro interno' });
        }
    }

    async updateTheme(req: Request, res: Response) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { colors } = req.body;
            const themeService = new ThemeService();
            await themeService.updateThemeSettings(colors);
            return res.json({ colors });
        } catch (error) {
            return res.status(500).json({ error: 'Erro ao atualizar' });
        }
    }

}

export { ThemeController };