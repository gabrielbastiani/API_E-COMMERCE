import * as fs from 'fs/promises';
import * as path from 'path';
import prismaClient from '../../prisma';

interface CreateTemplateRequest {
    title: string;
    subject: string;
    templateName: string;
    variables: string[];
    isActive?: boolean;
    hoursAfter?: number;
    content: string;
}

class CreateTemplateService {
    private templatesDir = path.resolve(__dirname, '../../../src/emails_templates');

    async execute({
        title,
        subject,
        templateName,
        variables,
        isActive = true,
        hoursAfter,
        content
    }: CreateTemplateRequest) {

        // Verificar se o templateName é único
        const existingTemplate = await prismaClient.emailTemplate.findFirst({
            where: { templateName }
        });

        if (existingTemplate) {
            throw new Error('Já existe um template com este nome');
        }

        // Criar arquivo físico
        const filePath = path.join(this.templatesDir, templateName);

        try {
            await fs.writeFile(filePath, content, 'utf8');
        } catch (error) {
            throw new Error(`Erro ao criar arquivo: ${(error as Error).message}`);
        }

        // Criar registro no banco
        return prismaClient.emailTemplate.create({
            data: {
                title,
                subject,
                templateName,
                variables,
                isActive,
                hoursAfter
            }
        });
    }
}

export { CreateTemplateService };