import axios from "axios";

export async function getStateFromCep(cep?: string): Promise<string | null> {
    if (!cep) return null;
    const cepDigits = cep.replace(/\D/g, "");
    if (!cepDigits) return null;
    try {
        const resp = await axios.get(`https://viacep.com.br/ws/${cepDigits}/json/`);
        if (!resp.data?.erro && resp.data?.uf) {
            return resp.data.uf;
        }
    } catch (err) {
        console.log("[PromotionEngine][cepService] erro ao buscar CEP:", err);
    }
    return null;
}