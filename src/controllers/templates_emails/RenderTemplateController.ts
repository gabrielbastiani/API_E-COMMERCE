import { Request, Response } from 'express';
import { RenderTemplateService } from '../../services/templates_emails/RenderTemplateService';

class RenderTemplateController {
    async handle(req: Request, res: Response) {
        try {
            const emailTemplate_id = req.query.emailTemplate_id as string;

            if (!emailTemplate_id) {
                res.status(400).json({
                    error: 'Parâmetro emailTemplate_id é obrigatório',
                    example: '/template_email/render?emailTemplate_id=ID_DO_TEMPLATE'
                });
            }

            const service = new RenderTemplateService();
            const html = await service.execute({
                emailTemplate_id,
                variables: req.body || {}
            });

            res.set('Content-Type', 'text/html');
            res.send(html);

        } catch (error: any) {
            console.error('[CONTROLLER ERROR] Full Error:', {
                error: error.stack,
                body: req.body,
                query: req.query,
                timestamp: new Date().toISOString()
            });

            res.status(500).json({
                error: error.message,
                debug: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }
}

export { RenderTemplateController };