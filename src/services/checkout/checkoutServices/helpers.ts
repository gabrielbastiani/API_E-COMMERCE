import prisma from "../../../prisma";
import * as AsaasClient from '../asaas.client';

// sanitiza CPF/CNPJ (remove tudo que não for dígito); retorna undefined se vazio
export function onlyDigits(str?: string | null) {
  if (str === undefined || str === null) return undefined;
  const s = String(str).replace(/\D/g, '');
  return s === '' ? undefined : s;
}

export async function ensureAsaasCustomerHasCpfCnpj(customer: any) {
  if (!customer) throw new Error('Customer obrigatório para ensureAsaasCustomerHasCpfCnpj');

  const cpfOrCnpj = customer.cpf ?? customer.cnpj ?? null;
  const cpfCnpjSan = onlyDigits(cpfOrCnpj ?? undefined);

  if (!cpfCnpjSan) {
    throw new Error('CPF ou CNPJ do cliente não informado. É necessário ter CPF ou CNPJ para criar cobrança na Asaas.');
  }

  if (!customer.asaas_customer_id) {
    try {
      const asaasCustomer = await AsaasClient.createCustomer({
        name: customer.name,
        email: customer.email ?? undefined,
        phone: customer.phone ?? undefined,
        cpfCnpj: cpfCnpjSan,
      });

      if (asaasCustomer?.id) {
        await prisma.customer.update({ where: { id: customer.id }, data: { asaas_customer_id: asaasCustomer.id } });
        customer.asaas_customer_id = asaasCustomer.id;
        return;
      } else {
        throw new Error('Criação do cliente na Asaas não retornou id.');
      }
    } catch (err: any) {
      throw new Error(`Falha ao criar cliente na Asaas (necessário CPF/CNPJ): ${err?.message ?? String(err)}`);
    }
  }

  if (customer.asaas_customer_id) {
    try {
      const asaasCust = await AsaasClient.getCustomer(customer.asaas_customer_id);
      const asaasCpfCnpj = asaasCust?.cpfCnpj ?? asaasCust?.cpf_cnpj ?? asaasCust?.cpf ?? asaasCust?.cnpj ?? null;
      if ((!asaasCpfCnpj || String(asaasCpfCnpj).trim() === '') && cpfCnpjSan) {
        try {
          await AsaasClient.updateCustomer(customer.asaas_customer_id, { cpfCnpj: cpfCnpjSan });
          return;
        } catch (err: any) {
          throw new Error(`Falha ao atualizar CPF/CNPJ do cliente no Asaas: ${err?.message ?? String(err)}`);
        }
      } else {
        return;
      }
    } catch (err: any) {
      try {
        const asaasCustomer = await AsaasClient.createCustomer({
          name: customer.name,
          email: customer.email ?? undefined,
          phone: customer.phone ?? undefined,
          cpfCnpj: cpfCnpjSan,
        });
        if (asaasCustomer?.id) {
          await prisma.customer.update({ where: { id: customer.id }, data: { asaas_customer_id: asaasCustomer.id } });
          customer.asaas_customer_id = asaasCustomer.id;
          return;
        } else {
          throw new Error('Criação alternativa do cliente na Asaas não retornou id.');
        }
      } catch (err2: any) {
        throw new Error(`Falha ao garantir CPF/CNPJ no Asaas para o cliente (id local: ${customer.id}): ${err2?.message ?? String(err2)}`);
      }
    }
  }
}