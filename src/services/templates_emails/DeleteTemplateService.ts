import * as fs from 'fs/promises';
import * as path from 'path';
import prismaClient from '../../prisma';

class DeleteTemplateService {
    private templatesDir = path.resolve(__dirname, '../../../src/emails_templates');

    async execute(emailTemplate_id: string) {
        // Encontrar o template
        const template = await prismaClient.emailTemplate.findUnique({
            where: { id: emailTemplate_id }
        });

        if (!template) {
            throw new Error('Template não encontrado');
        }

        // Deletar arquivo físico
        const filePath = path.join(this.templatesDir, template.templateName);

        try {
            await fs.access(filePath);
            await fs.unlink(filePath);
        } catch (error) {
            console.warn(`Arquivo ${template.templateName} não encontrado, continuando exclusão...`);
        }

        // Deletar do banco de dados
        return prismaClient.emailTemplate.delete({
            where: { id: emailTemplate_id }
        });
    }
}

export { DeleteTemplateService };