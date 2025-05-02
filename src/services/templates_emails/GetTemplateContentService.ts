import prismaClient from '../../prisma';
import * as fs from 'fs/promises';
import * as path from 'path';

interface TemplateRequest {
    emailTemplate_id: string;
}

class GetTemplateContentService {
    async execute({ emailTemplate_id}: TemplateRequest ) {

        const templatesDir = path.resolve(__dirname, '../../../src/emails_templates');

        const template = await prismaClient.emailTemplate.findFirst({
            where: { id: emailTemplate_id }
        });

        if (!template) {
            throw new Error('Template not found');
        }

        const filePath = path.join(templatesDir, template.templateName);
        try {
            const content = await fs.readFile(filePath, 'utf8');
            return { content };
        } catch (error) {
            throw new Error(`Error reading template file: ${(error as Error).message}`);
        }
    }
}

export { GetTemplateContentService };