import * as fs from 'fs/promises';
import * as path from 'path';
import prismaClient from '../../prisma';

interface TemplateRequest {
    emailTemplate_id: string;
    newContent: string;
    templateName?: string;
}

class UpdateTemplateContentService {
    private templatesDir = path.resolve(__dirname, '../../../src/emails_templates');

    async execute({ emailTemplate_id, newContent, templateName }: TemplateRequest) {
        const template = await prismaClient.emailTemplate.findUnique({
            where: { id: emailTemplate_id }
        });

        if (!template) {
            throw new Error('Template not found');
        }

        // Renomear arquivo se necessário
        let finalTemplateName = template.templateName;
        if (templateName && templateName !== template.templateName) {
            const oldPath = path.join(this.templatesDir, template.templateName);
            const newPath = path.join(this.templatesDir, templateName);
            await fs.rename(oldPath, newPath);
            finalTemplateName = templateName;
        }

        const filePath = path.join(this.templatesDir, finalTemplateName);
        await fs.writeFile(filePath, newContent, 'utf8');

        // Atualizar apenas o nome do template se necessário
        return prismaClient.emailTemplate.update({
            where: { id: emailTemplate_id },
            data: {
                templateName: finalTemplateName
            }
        });
    }
}

export { UpdateTemplateContentService };