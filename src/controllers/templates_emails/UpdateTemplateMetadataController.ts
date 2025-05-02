import { Request, Response } from 'express';
import { UpdateTemplateMetadataService } from '../../services/templates_emails/UpdateTemplateMetadataService';

class UpdateTemplateMetadataController {
    async handle(req: Request, res: Response) {
        try {
            const emailTemplate_id = req.query.emailTemplate_id as string;
            const { title, subject, variables, isActive, hoursAfter } = req.body;

            const service = new UpdateTemplateMetadataService();
            const updatedTemplate = await service.execute({
                emailTemplate_id,
                title,
                subject,
                variables,
                isActive,
                hoursAfter
            });

            res.json(updatedTemplate);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
}

export { UpdateTemplateMetadataController };