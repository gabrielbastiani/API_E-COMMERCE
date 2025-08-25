import { Request, Response } from "express";
import * as CheckoutService from "../../services/checkout/checkout.service";
import { calculateFreight, CartItem } from "../../services/frete/FreteService";

// Alias em 'any' para contornar falta de tipos/exports no service
const CS: any = CheckoutService as any;

/* List addresses (requires authenticated customer) */
export async function getAddresses(req: Request, res: Response) {
  try {
    const customer_id = (req as any).customer_id as string | undefined;

    if (!customer_id) {
      res.status(401).json({ message: "Unauthorized" });
    } else if (typeof CS.listAddresses !== "function") {
      res.status(501).json({ message: "listAddresses não implementado no serviço" });
    } else {
      const list = await CS.listAddresses(customer_id);
      res.json(list);
    }
  } catch (err) {
    console.error("getAddresses error", err);
    res.status(500).json({ message: "Erro ao buscar endereços" });
  }
}

/* Create address (authenticated only) */
export async function createAddress(req: Request, res: Response) {
  try {
    const customer_id = (req as any).customer_id as string | undefined;

    if (!customer_id) {
      res.status(401).json({ message: "Unauthorized" });
    } else if (typeof CS.createAddress !== "function") {
      res.status(501).json({ message: "createAddress não implementado no serviço" });
    } else {
      const payload = req.body;
      const address = await CS.createAddress(customer_id, payload);
      res.status(201).json(address);
    }
  } catch (err: any) {
    console.error("createAddress error", err);
    res.status(400).json({ message: err?.message ?? "Erro ao criar endereço" });
  }
}

/* Update address (authenticated only) */
export async function updateAddress(req: Request, res: Response) {
  try {
    const customer_id = (req as any).customer_id as string | undefined;

    if (!customer_id) {
      res.status(401).json({ message: "Unauthorized" });
    } else if (typeof CS.updateAddress !== "function") {
      res.status(501).json({ message: "updateAddress não implementado no serviço" });
    } else {
      const id = req.params.id as string;
      const payload = req.body;
      const updated = await CS.updateAddress(customer_id, id, payload);
      res.json(updated);
    }
  } catch (err: any) {
    console.error("updateAddress error", err);
    res.status(400).json({ message: err?.message ?? "Erro ao atualizar endereço" });
  }
}

/* Delete address (authenticated only) */
export async function deleteAddress(req: Request, res: Response) {
  try {
    const customer_id = (req as any).customer_id as string | undefined;

    if (!customer_id) {
      res.status(401).json({ message: "Unauthorized" });
    } else if (typeof CS.deleteAddress !== "function") {
      res.status(501).json({ message: "deleteAddress não implementado no serviço" });
    } else {
      const id = req.params.id as string;
      await CS.deleteAddress(customer_id, id);
      res.status(204).send();
    }
  } catch (err: any) {
    console.error("deleteAddress error", err);
    res.status(400).json({ message: err?.message ?? "Erro ao remover endereço" });
  }
}

/**
 * calculateShipping
 * Body: { cepDestino: string, items: CartItem[] }
 * Usa FreteService.calculateFreight (o mesmo do frontend).
 */
export async function calculateShipping(req: Request, res: Response) {
  try {
    const body = req.body as { cepDestino?: string; items?: any[] };

    if (!body || typeof body.cepDestino !== "string" || !Array.isArray(body.items)) {
      res.status(400).json({ message: "Parâmetros inválidos. Envie cepDestino (string) e items (array)." });
    } else {
      const cepDestinoRaw = (body.cepDestino ?? "").replace(/\D/g, "");
      if (!cepDestinoRaw) {
        res.status(400).json({ message: "CEP de destino inválido." });
      } else {
        const items = body.items as CartItem[];
        const options = await calculateFreight(cepDestinoRaw, items);
        res.json({ options });
      }
    }
  } catch (err: any) {
    console.error("calculateShipping handler error", err);
    res.status(400).json({ message: err?.message ?? "Erro ao calcular frete" });
  }
}

/* getPaymentOptions - delega ao service se existir, senão fallback */
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

/* placeOrder - delega ao serviço */
export async function placeOrder(req: Request, res: Response) {
  try {
    const customer_id = (req as any).customer_id as string | undefined;

    if (typeof CS.placeOrder !== "function") {
      res.status(501).json({ message: "placeOrder não implementado no serviço" });
    } else {
      const payload = req.body;
      const result = await CS.placeOrder({ customer_id, ...payload });
      res.json(result);
    }
  } catch (err: any) {
    console.error("placeOrder error", err);
    res.status(400).json({ message: err?.message ?? "Erro ao criar pedido" });
  }
}