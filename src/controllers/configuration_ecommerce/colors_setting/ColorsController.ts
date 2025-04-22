import { Request, Response } from 'express';
import { ColorsService } from '../../../services/configuration_ecommerce/colors_setting/ColorsService';
import { validationResult } from 'express-validator/lib/validation-result';

class ColorsController {
    async getTheme(req: Request, res: Response): Promise<void> {
        try {
            const themeService = new ColorsService();
            const colors = await themeService.getThemeSettings();
            res.json({ colors });
        } catch (error) {
            res.status(500).json({ error: 'Erro interno' });
        }
    }

    async updateTheme(req: Request, res: Response) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
        }

        try {
            const { colors } = req.body;
            const themeService = new ColorsService();
            await themeService.updateThemeSettings(colors);
            res.json({ colors });
        } catch (error) {
            res.status(500).json({ error: 'Erro ao atualizar' });
        }
    }

}

export { ColorsController };