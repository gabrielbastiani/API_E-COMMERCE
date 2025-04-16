import { PrismaClient, EmailTemplate } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';
import ejs from 'ejs';

class EmailTemplateService {
  private prisma: PrismaClient;
  private templatesDir: string;

  constructor() {
    this.prisma = new PrismaClient();
    this.templatesDir = path.resolve(__dirname, '../../emails_templates');
  }

  private async templateExists(templateName: string): Promise<boolean> {
    try {
      await fs.access(path.join(this.templatesDir, templateName));
      return true;
    } catch {
      return false;
    }
  }

  async getAllTemplates(): Promise<EmailTemplate[]> {
    return this.prisma.emailTemplate.findMany();
  }

  async getTemplateById(id: string): Promise<EmailTemplate | null> {
    return this.prisma.emailTemplate.findUnique({ where: { id } });
  }

  async getTemplateByTitle(title: string): Promise<EmailTemplate | null> {
    return this.prisma.emailTemplate.findFirst({ where: { title } });
  }

  async createTemplate(data: {
    title: string;
    subject: string;
    templateName: string;
    variables?: string[];
    isActive?: boolean;
    daysAfter?: number;
  }): Promise<EmailTemplate> {
    if (!(await this.templateExists(data.templateName))) {
      throw new Error(`Template file ${data.templateName} not found`);
    }

    return this.prisma.emailTemplate.create({
      data: {
        title: data.title,
        subject: data.subject,
        templateName: data.templateName,
        variables: data.variables || [],
        isActive: data.isActive ?? true,
        daysAfter: data.daysAfter || 0,
      },
    });
  }

  async updateTemplate(
    id: string,
    data: {
      title?: string;
      subject?: string;
      templateName?: string;
      variables?: string[];
      isActive?: boolean;
      daysAfter?: number;
    }
  ): Promise<EmailTemplate> {
    if (data.templateName && !(await this.templateExists(data.templateName))) {
      throw new Error(`Template file ${data.templateName} not found`);
    }

    return this.prisma.emailTemplate.update({
      where: { id },
      data: {
        title: data.title,
        subject: data.subject,
        templateName: data.templateName,
        variables: data.variables,
        isActive: data.isActive,
        daysAfter: data.daysAfter,
      },
    });
  }

  async deleteTemplate(id: string): Promise<EmailTemplate> {
    return this.prisma.emailTemplate.delete({ where: { id } });
  }

  async renderTemplate(templateName: string, data: object): Promise<string> {
    const filePath = path.join(this.templatesDir, templateName);
    try {
      const templateStr = await fs.readFile(filePath, 'utf8');
      return ejs.render(templateStr, data);
    } catch (error) {
      throw new Error(`Error rendering template: ${(error as Error).message}`);
    }
  }

  async renderTemplateById(id: string, data: object): Promise<string> {
    const template = await this.getTemplateById(id);
    if (!template) {
      throw new Error('Template not found');
    }
    return this.renderTemplate(template.templateName, data);
  }
}

export default new EmailTemplateService();