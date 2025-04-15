import { Request, Response } from 'express';
import EmailTemplateService from '../../services/templates_emails/EmailTemplateService'; 

class EmailTemplateController {
  // Lista todos os templates
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const templates = await EmailTemplateService.getAllTemplates();
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Retorna um template pelo ID
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const template = await EmailTemplateService.getTemplateById(id);
      if (!template) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Cria um novo template
  async create(req: Request, res: Response): Promise<void> {
    try {
      const { title, subject, content, variables, isActive, daysAfter } = req.body;
      const newTemplate = await EmailTemplateService.createTemplate({
        title,
        subject,
        content,
        variables,
        isActive,
        daysAfter,
      });
      res.status(201).json(newTemplate);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Atualiza um template existente
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, subject, content, variables, isActive, daysAfter } = req.body;
      const updatedTemplate = await EmailTemplateService.updateTemplate(id, {
        title,
        subject,
        content,
        variables,
        isActive,
        daysAfter,
      });
      res.json(updatedTemplate);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Exclui um template pelo ID
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deletedTemplate = await EmailTemplateService.deleteTemplate(id);
      res.json(deletedTemplate);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Endpoint para renderizar o template com dados fornecidos (útil para testes de preview)
  async render(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data = req.body; // Os dados para substituir os placeholders devem ser enviados no corpo da requisição
      const renderedContent = await EmailTemplateService.renderTemplate(id, data);
      res.send(renderedContent);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new EmailTemplateController();