import { Request, Response } from "express";
import * as service from "../../../services/users/customers/orders/commentOrder.service";

/**
 * POST /admin/orders/:orderId/comments
 * Body: form-data (message, visible, assignToOrder, files[])
 */
export async function adminPostOrderComment(req: Request, res: Response) {
  try {
    const { orderId } = req.params;
    const message = (req.body?.message ?? "").trim();
    // visible pode vir como "true"/"false" strings do form-data
    const visible = req.body?.visible === "false" ? false : Boolean(req.body?.visible ?? true);
    const assignToOrder = req.body?.assignToOrder === "true";
    // seu middleware define req.userEcommerce = { id, role }
    const userEcommerce = (req as any).userEcommerce;
    if (!userEcommerce || !userEcommerce.id) {
      // não autenticado como staff
      res.status(401).json({ message: "Não autenticado (admin)" });
    }

    const userEcommerceId: string = userEcommerce.id;

    // Pelo menos mensagem ou arquivo deve existir
    const files = (req as any).files as Express.Multer.File[] | undefined;
    if (!message && (!files || files.length === 0)) {
      res.status(400).json({ message: "Mensagem ou arquivo obrigatório" });
    }

    // cria comentário via service (validações internas também)
    const created = await service.createCommentByStaff(orderId, userEcommerceId, message, visible, assignToOrder);

    // se houver arquivos enviados (Multer preenche req.files)
    if (files && files.length > 0) {
      const attachPayload = files.map((f) => ({
        url: `/commentAttachment/${f.filename}`, // rota pública que você deve servir (ver server.ts)
        filename: f.originalname,
        mimetype: f.mimetype,
        size: f.size,
      }));
      await service.addAttachmentsToComment(created.id, attachPayload);
    }

    // retorna comment criado + conversation atualizada
    const comments = await service.getCommentsByOrderForAdmin(orderId);
    res.status(201).json({ data: created, conversation: comments });
  } catch (err: any) {
    console.error("adminPostOrderComment error:", err);
    if (res.headersSent) return;
    const status = err?.status ?? 500;
    const message = err?.message ?? "Erro ao criar comentário (admin)";
    res.status(status).json({ message });
  }
}

/**
 * GET /admin/orders/:orderId/comments
 */
export async function adminGetOrderComments(req: Request, res: Response) {
  try {
    const { orderId } = req.params;
    const userEcommerce = (req as any).userEcommerce;
    if (!userEcommerce || !userEcommerce.id) {
      res.status(401).json({ message: "Não autenticado (admin)" });
    }

    const comments = await service.getCommentsByOrderForAdmin(orderId);
    res.json({ data: comments });
  } catch (err: any) {
    console.error("adminGetOrderComments error:", err);
    if (res.headersSent) return;
    const status = err?.status ?? 500;
    const message = err?.message ?? "Erro ao obter comentários (admin)";
    res.status(status).json({ message });
  }
}