import * as fs from 'fs/promises';
import * as path from 'path';
import ejs from 'ejs';
import prismaClient from '../../prisma';

interface RenderRequest {
  emailTemplate_id: string;
  variables: Record<string, any>;
}

class RenderTemplateService {
  private templatesDir = path.resolve(__dirname, '../../../src/emails_templates');

  async execute({ emailTemplate_id, variables }: RenderRequest): Promise<string> {
    try {
      // 1. Validação rigorosa do ID
      if (!emailTemplate_id || typeof emailTemplate_id !== 'string') {
        throw new Error('ID do template inválido');
      }

      // 2. Busca com tratamento de erros do Prisma
      const template = await prismaClient.emailTemplate.findUnique({
        where: { id: emailTemplate_id },
        select: { templateName: true }
      }).catch(err => {
        throw new Error(`Erro no banco de dados: ${err.message}`);
      });

      if (!template?.templateName) {
        throw new Error(`Template não encontrado para o ID: ${emailTemplate_id}`);
      }

      // 3. Construção segura do caminho
      const sanitizedTemplateName = template.templateName.replace(/\.\./g, '');
      const filePath = path.join(this.templatesDir, sanitizedTemplateName);

      // 4. Verificação de existência do arquivo
      try {
        await fs.access(filePath, fs.constants.R_OK);
      } catch (error) {
        throw new Error(`Arquivo não encontrado: ${filePath}`);
      }

      // 5. Leitura e renderização com tratamento de erros
      try {
        const templateContent = await fs.readFile(filePath, 'utf8');
        return await ejs.render(
          templateContent,
          variables,
          { async: true, strict: false }
        );
      } catch (renderError) {
        throw new Error(`Erro EJS: ${(renderError as Error).message}`);
      }

    } catch (error) {
      console.error('[RENDER ERROR] Details:', {
        error: error instanceof Error ? error.stack : error,
        emailTemplate_id,
        time: new Date().toISOString()
      });
      throw error;
    }
  }
}

export { RenderTemplateService };