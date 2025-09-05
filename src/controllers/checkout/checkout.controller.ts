// src/controllers/checkout/checkout.controller.ts
import { Request, Response } from "express";
import * as CheckoutService from "../../services/checkout/checkoutServices/checkout.service";
import { calculateFreight, CartItem } from "../../services/frete/FreteService";

const CS: any = CheckoutService as any;

export async function getAddresses(req: Request, res: Response) {
  try {
    const customer_id = (req as any).customer_id as string | undefined;
    if (!customer_id) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    if (typeof CS.listAddresses !== "function") {
      res.status(501).json({ message: "listAddresses não implementado no serviço" });
      return;
    }
    const list = await CS.listAddresses(customer_id);
    res.json(list);
  } catch (err) {
    console.error("getAddresses error", err);
    res.status(500).json({ message: "Erro ao buscar endereços" });
  }
}

export async function createAddress(req: Request, res: Response) {
  try {
    const customer_id = (req as any).customer_id as string | undefined;
    if (!customer_id) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    if (typeof CS.createAddress !== "function") {
      res.status(501).json({ message: "createAddress não implementado no serviço" });
      return;
    }
    const payload = req.body;
    const address = await CS.createAddress(customer_id, payload);
    res.status(201).json(address);
  } catch (err: any) {
    console.error("createAddress error", err);
    res.status(400).json({ message: err?.message ?? "Erro ao criar endereço" });
  }
}

export async function updateAddress(req: Request, res: Response) {
  try {
    const customer_id = (req as any).customer_id as string | undefined;
    if (!customer_id) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    if (typeof CS.updateAddress !== "function") {
      res.status(501).json({ message: "updateAddress não implementado no serviço" });
      return;
    }
    const id = req.body.address_id ?? req.params.id;
    if (!id) {
      res.status(400).json({ message: "address_id obrigatório" });
      return;
    }
    const payload = req.body;
    const updated = await CS.updateAddress(customer_id, id, payload);
    res.json(updated);
  } catch (err: any) {
    console.error("updateAddress error", err);
    res.status(400).json({ message: err?.message ?? "Erro ao atualizar endereço" });
  }
}

export async function deleteAddress(req: Request, res: Response) {
  try {
    const customer_id = (req as any).customer_id as string | undefined;
    if (!customer_id) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    if (typeof CS.deleteAddress !== "function") {
      res.status(501).json({ message: "deleteAddress não implementado no serviço" });
      return;
    }
    const id = (req.query.address_id as string) ?? req.params.id;
    if (!id) {
      res.status(400).json({ message: "address_id obrigatório" });
      return;
    }
    await CS.deleteAddress(customer_id, id);
    res.status(204).send();
  } catch (err: any) {
    console.error("deleteAddress error", err);
    res.status(400).json({ message: err?.message ?? "Erro ao remover endereço" });
  }
}

export async function calculateShipping(req: Request, res: Response) {
  try {
    const body = req.body as { cepDestino?: string; items?: any[] };
    if (!body || typeof body.cepDestino !== "string" || !Array.isArray(body.items)) {
      res.status(400).json({ message: "Parâmetros inválidos. Envie cepDestino (string) e items (array)." });
      return;
    } else {
      const cepDestinoRaw = (body.cepDestino ?? "").replace(/\D/g, "");
      if (!cepDestinoRaw) {
        res.status(400).json({ message: "CEP de destino inválido." });
        return;
      } else {
        const items = body.items as CartItem[];
        const options = await calculateFreight(cepDestinoRaw, items);
        res.json({ options });
        return;
      }
    }
  } catch (err: any) {
    console.error("calculateShipping handler error", err);
    res.status(400).json({ message: err?.message ?? "Erro ao calcular frete" });
  }
}

export async function getPaymentOptions(req: Request, res: Response) {
  try {
    if (typeof CS.getPaymentOptions === "function") {
      const opts = await CS.getPaymentOptions();
      res.json(opts);
    } else {
      const fallback = [
        { id: "asaas-pix", provider: "Asaas", method: "PIX", label: "PIX (pagamento instantâneo)", description: "Pague via QR Code Pix" },
        { id: "asaas-boleto", provider: "Asaas", method: "BOLETO", label: "Boleto bancário", description: "Pague com boleto" },
        { id: "asaas-card", provider: "Asaas", method: "CARD", label: "Cartão de crédito", description: "Pague com cartão de crédito (via tokenização)" },
      ];
      res.json(fallback);
    }
  } catch (err) {
    console.error("getPaymentOptions error", err);
    res.status(500).json({ message: "Erro ao buscar formas de pagamento" });
  }
}

/* placeOrder - delega ao serviço e retorna orderData completo */
export async function placeOrder(req: Request, res: Response) {
  try {
    const customer_id = (req as any).customer_id as string | undefined;

    if (typeof CS.placeOrder !== "function") {
      res.status(501).json({ message: "placeOrder não implementado no serviço" });
      return;
    }

    const payload = req.body ?? {};

    // validações básicas de payload (itens, shippingId, paymentId)
    const items = Array.isArray(payload.items) ? payload.items : [];
    if (!items.length) {
      res.status(400).json({ message: "items obrigatório (array com ao menos 1 item)" });
      return;
    }
    if (!payload.shippingId) {
      res.status(400).json({ message: "shippingId obrigatório" });
      return;
    }
    if (!payload.paymentId) {
      res.status(400).json({ message: "paymentId obrigatório" });
      return;
    }

    // Opcional: permitir envio de orderTotalOverride e cartId no body
    // Exemplo: { cartId: '...', orderTotalOverride: 123.45, ... }
    // Repassamos tudo para o serviço (que irá validar/usar orderTotalOverride)
    const callPayload = { customer_id, ...payload };

    const result = await CS.placeOrder(callPayload);

    // Caso o serviço retorne sucesso, devolve 200 com o objeto completo
    res.json(result);
  } catch (err: any) {
    console.error("placeOrder error", err);
    // Se for erro de validação/negócio retornado pelo serviço
    const statusCode = err && err.statusCode ? err.statusCode : 400;
    if (statusCode >= 500) {
      res.status(500).json({ message: err?.message ?? "Erro interno ao criar pedido" });
    } else {
      res.status(400).json({ message: err?.message ?? "Erro ao criar pedido" });
    }
  }
}