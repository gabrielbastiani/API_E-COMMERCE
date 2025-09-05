export async function getPaymentOptions() {
    return [
        { id: 'asaas-pix', provider: 'Asaas', method: 'PIX', label: 'PIX (pagamento instantâneo)', description: 'Pague via QR Code / Payload Pix' },
        { id: 'asaas-boleto', provider: 'Asaas', method: 'BOLETO', label: 'Boleto bancário', description: 'Pague com boleto' },
        { id: 'asaas-card', provider: 'Asaas', method: 'CARD', label: 'Cartão de crédito', description: 'Cartão de crédito' },
    ];
}