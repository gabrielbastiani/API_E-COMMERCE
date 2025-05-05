import { Request, Response } from 'express';
import { DeleteTemplateService } from '../../services/templates_emails/DeleteTemplateService';

class DeleteTemplateController {
    async handle(req: Request, res: Response) {
        try {
            const emailTemplate_id = req.query.emailTemplate_id as string;

            const service = new DeleteTemplateService();
            await service.execute(emailTemplate_id);

            res.json({ success: true });

        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
}

export { DeleteTemplateController };