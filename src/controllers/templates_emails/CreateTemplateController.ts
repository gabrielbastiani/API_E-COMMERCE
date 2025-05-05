import { Request, Response } from 'express';
import { CreateTemplateService } from '../../services/templates_emails/CreateTemplateService';

class CreateTemplateController {
    async handle(req: Request, res: Response) {
        try {
            const {
                title,
                subject,
                templateName,
                variables,
                isActive,
                hoursAfter,
                content
            } = req.body;

            const service = new CreateTemplateService();
            const template = await service.execute({
                title,
                subject,
                templateName,
                variables: Array.isArray(variables) ? variables : [],
                isActive,
                hoursAfter: Number(hoursAfter) || undefined,
                content
            });

            res.status(201).json(template);

        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
}

export { CreateTemplateController };