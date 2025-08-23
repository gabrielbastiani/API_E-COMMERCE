import { Request, Response } from 'express';
import * as CheckoutService from '../../services/checkout/checkout.service';

export async function getAddresses(req: Request, res: Response) {
  try {
    const customer_id = (req as any).customer_id as string;
    if (!customer_id) res.status(401).json({ message: 'Unauthorized' });
    const list = await CheckoutService.listAddresses(customer_id);
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao buscar endereços' });
  }
}

export async function createAddress(req: Request, res: Response) {
  try {
    const customer_id = (req as any).customer_id as string;
    if (!customer_id) res.status(401).json({ message: 'Unauthorized' });
    const payload = req.body;
    const address = await CheckoutService.createAddress(customer_id, payload);
    res.status(201).json(address);
  } catch (err: any) {
    console.error(err);
    res.status(400).json({ message: err?.message ?? 'Erro ao criar endereço' });
  }
}

export async function updateAddress(req: Request, res: Response) {
  try {
    const customer_id = (req as any).customer_id as string;
    if (!customer_id) res.status(401).json({ message: 'Unauthorized' });
    const id = req.params.id;
    const payload = req.body;
    const updated = await CheckoutService.updateAddress(customer_id, id, payload);
    res.json(updated);
  } catch (err: any) {
    console.error(err);
    res.status(400).json({ message: err?.message ?? 'Erro ao atualizar endereço' });
  }
}

export async function deleteAddress(req: Request, res: Response) {
  try {
    const customer_id = (req as any).customer_id as string;
    if (!customer_id) res.status(401).json({ message: 'Unauthorized' });
    const id = req.params.id;
    await CheckoutService.deleteAddress(customer_id, id);
    res.status(204).send();
  } catch (err: any) {
    console.error(err);
    res.status(400).json({ message: err?.message ?? 'Erro ao remover endereço' });
  }
}

export async function calculateShipping(req: Request, res: Response) {
  try {
    const customer_id = (req as any).customer_id as string | undefined;
    const { addressId, address, items } = req.body;
    const result = await CheckoutService.calculateShipping({ customer_id, addressId, address, items });
    res.json({ options: result });
  } catch (err: any) {
    console.error(err);
    res.status(400).json({ message: err?.message ?? 'Erro ao calcular frete' });
  }
}

export async function getPaymentOptions(req: Request, res: Response) {
  try {
    const opts = await CheckoutService.getPaymentOptions();
    res.json(opts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao buscar formas de pagamento' });
  }
}

export async function placeOrder(req: Request, res: Response) {
  try {
    const customer_id = (req as any).customer_id as string | undefined;
    const payload = req.body;
    const result = await CheckoutService.placeOrder({ customer_id, ...payload });
    res.json(result);
  } catch (err: any) {
    console.error('placeOrder error', err);
    res.status(400).json({ message: err?.message ?? 'Erro ao criar pedido' });
  }
}