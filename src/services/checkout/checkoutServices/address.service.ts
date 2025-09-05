import prisma from '../../../prisma';
import { AddressPayload } from './types';

export async function listAddresses(customerId: string) {
    if (!customerId) throw new Error('customer_id obrigatório');
    return prisma.address.findMany({ where: { customer_id: customerId }, orderBy: { created_at: 'desc' } as any });
}

export async function createAddress(customerId: string, payload: Partial<AddressPayload>) {
    if (!customerId) throw new Error('customer_id obrigatório');
    const data: any = {
        customer: { connect: { id: customerId } },
        recipient_name: payload.recipient_name ?? '',
        street: payload.street ?? '',
        city: payload.city ?? '',
        state: payload.state ?? '',
        zipCode: payload.zipCode ?? '',
        number: payload.number ?? '',
        neighborhood: payload.neighborhood ?? '',
        country: payload.country ?? 'Brasil',
        complement: payload.complement ?? null,
        reference: payload.reference ?? null,
    };
    return prisma.address.create({ data });
}

export async function updateAddress(customerId: string, addressId: string, payload: Partial<AddressPayload>) {
    if (!customerId) throw new Error('customer_id obrigatório');
    const existing = await prisma.address.findUnique({ where: { id: addressId } });
    if (!existing) throw new Error('Endereço não encontrado');
    if (existing.customer_id !== customerId) throw new Error('Não autorizado');
    const data: any = {
        recipient_name: payload.recipient_name ?? existing.recipient_name,
        street: payload.street ?? existing.street,
        city: payload.city ?? existing.city,
        state: payload.state ?? existing.state,
        zipCode: payload.zipCode ?? existing.zipCode,
        number: payload.number ?? existing.number,
        neighborhood: payload.neighborhood ?? existing.neighborhood,
        country: payload.country ?? existing.country,
        complement: payload.complement ?? existing.complement,
        reference: payload.reference ?? existing.reference,
    };
    return prisma.address.update({ where: { id: addressId }, data });
}

export async function deleteAddress(customerId: string, addressId: string) {
    if (!customerId) throw new Error('customer_id obrigatório');
    const existing = await prisma.address.findUnique({ where: { id: addressId } });
    if (!existing) throw new Error('Endereço não encontrado');
    if (existing.customer_id !== customerId) throw new Error('Não autorizado');
    await prisma.address.delete({ where: { id: addressId } });
    return true;
}