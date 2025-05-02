import { Request, Response } from 'express';
import { GetTemplateContentService } from '../../services/templates_emails/GetTemplateContentService';

class GetTemplateContentController {
    async handle(req: Request, res: Response) {
        try {
            const emailTemplate_id = req.query.emailTemplate_id as string;

            const service = new GetTemplateContentService();
            const result = await service.execute({ emailTemplate_id });

            res.json(result);

        } catch (error: any) {
            res.status(404).json({ error: error.message });
        }
    }
}

export { GetTemplateContentController };