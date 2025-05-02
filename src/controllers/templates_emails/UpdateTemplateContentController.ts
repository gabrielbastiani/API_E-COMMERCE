import { Request, Response } from 'express';
import { UpdateTemplateContentService } from '../../services/templates_emails/UpdateTemplateContentService';

class UpdateTemplateContentController {
    async handle(req: Request, res: Response) {
        try {
            const emailTemplate_id = req.query.emailTemplate_id as string;
            const { newContent, templateName } = req.body;

            const service = new UpdateTemplateContentService();
            const updatedTemplate = await service.execute({
                emailTemplate_id,
                newContent,
                templateName
            });

            res.json({
                ...updatedTemplate,
                message: 'Template updated successfully'
            });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
}

export { UpdateTemplateContentController };