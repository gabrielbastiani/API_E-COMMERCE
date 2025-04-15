import { PrismaClient, EmailTemplate } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';
import ejs from 'ejs';

class EmailTemplateService {
  private prisma: PrismaClient;
  private templatesDir: string;

  constructor() {
    this.prisma = new PrismaClient();
    // Define um diretório para os templates EJS. Este diretório pode ser ajustado conforme necessário.
    this.templatesDir = path.resolve(process.cwd(), '../../emails_templates');
    this.initializeTemplatesDir();
  }

  // Garante que o diretório de templates exista
  private async initializeTemplatesDir(): Promise<void> {
    try {
      await fs.access(this.templatesDir);
    } catch (error) {
      await fs.mkdir(this.templatesDir, { recursive: true });
    }
  }

  // Retorna o caminho completo do arquivo EJS associado a um template
  private getTemplateFilePath(id: string): string {
    return path.join(this.templatesDir, `${id}.ejs`);
  }

  // Lê o conteúdo do arquivo EJS para um template específico
  async getTemplateFile(id: string): Promise<string> {
    const filePath = this.getTemplateFilePath(id);
    return await fs.readFile(filePath, 'utf8');
  }

  // Salva (ou atualiza) o arquivo EJS com o conteúdo fornecido
  async saveTemplateFile(id: string, content: string): Promise<void> {
    const filePath = this.getTemplateFilePath(id);
    await fs.writeFile(filePath, content, 'utf8');
  }

  // Renderiza o template EJS substituindo os placeholders pelos dados informados
  async renderTemplate(id: string, data: any): Promise<string> {
    const templateStr = await this.getTemplateFile(id);
    return ejs.render(templateStr, data);
  }

  // Consulta todos os templates cadastrados
  async getAllTemplates(): Promise<EmailTemplate[]> {
    return await this.prisma.emailTemplate.findMany();
  }

  // Consulta um template pelo seu ID
  async getTemplateById(id: string): Promise<EmailTemplate | null> {
    return await this.prisma.emailTemplate.findUnique({ where: { id } });
  }

  // Cria um novo template e salva o arquivo EJS correspondente
  async createTemplate(data: {
    title: string;
    subject: string;
    content: string;
    variables: any;
    isActive?: boolean;
    daysAfter: number;
  }): Promise<EmailTemplate> {
    const template = await this.prisma.emailTemplate.create({
      data: {
        title: data.title,
        subject: data.subject,
        content: data.content,
        variables: data.variables,
        isActive: data.isActive ?? true,
        daysAfter: data.daysAfter,
      },
    });
    // Armazena o conteúdo EJS no arquivo correspondente
    await this.saveTemplateFile(template.id, data.content);
    return template;
  }

  // Atualiza os dados (e o arquivo EJS, se necessário) de um template existente
  async updateTemplate(
    id: string,
    data: {
      title?: string;
      subject?: string;
      content?: string;
      variables?: any;
      isActive?: boolean;
      daysAfter?: number;
    }
  ): Promise<EmailTemplate> {
    const template = await this.prisma.emailTemplate.update({
      where: { id },
      data: {
        title: data.title,
        subject: data.subject,
        content: data.content,
        variables: data.variables,
        isActive: data.isActive,
        daysAfter: data.daysAfter,
      },
    });
    // Se o conteúdo foi atualizado, atualiza também o arquivo EJS correspondente
    if (data.content) {
      await this.saveTemplateFile(template.id, data.content);
    }
    return template;
  }

  // Exclui um template e remove o arquivo EJS associado
  async deleteTemplate(id: string): Promise<EmailTemplate> {
    const template = await this.prisma.emailTemplate.delete({ where: { id } });
    try {
      await fs.unlink(this.getTemplateFilePath(template.id));
    } catch (err) {
      // Se o arquivo não existir ou houver algum erro, simplesmente ignore
    }
    return template;
  }
}

export default new EmailTemplateService();