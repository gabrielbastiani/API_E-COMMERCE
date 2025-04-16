import { Request, Response } from 'express';
import EmailTemplateService from '../../services/templates_emails/EmailTemplateService';

class EmailTemplateController {
  async getAll(req: Request, res: Response) {
    try {
      const templates = await EmailTemplateService.getAllTemplates();
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const template = await EmailTemplateService.getTemplateById(req.params.id);
      template ? res.json(template) : res.status(404).json({ error: 'Template not found' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const newTemplate = await EmailTemplateService.createTemplate(req.body);
      res.status(201).json(newTemplate);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const updatedTemplate = await EmailTemplateService.updateTemplate(
        req.params.id,
        req.body
      );
      res.json(updatedTemplate);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const deletedTemplate = await EmailTemplateService.deleteTemplate(req.params.id);
      res.json(deletedTemplate);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async renderById(req: Request, res: Response) {
    try {
      const renderedContent = await EmailTemplateService.renderTemplateById(
        req.params.id,
        req.body
      );
      res.send(renderedContent);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  async renderByName(req: Request, res: Response) {
    try {
      const { templateName } = req.params;
      const renderedContent = await EmailTemplateService.renderTemplate(
        templateName,
        req.body
      );
      res.send(renderedContent);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }
}

export default new EmailTemplateController();