import prismaClient from "../../prisma";

export interface CartItemDTO {
    id: string;
    product_id: string;
    variant_id?: string | null;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string | null;
}

export interface CartDTO {
    id: string;
    items: CartItemDTO[];
    subtotal: number;
    shippingCost: number;
    total: number;
}

export class CartService {
    // retorna o carrinho do usuário (inclui items e recalcula totais)
    static async getCart(customer_id: string): Promise<CartDTO> {
        // busca cart e items, incluindo produto e possível variante para obter preço/imagem corretos
        const cart = await prismaClient.cart.findUnique({
            where: { customer_id: customer_id },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                price_per: true,
                                images: { take: 1, select: { url: true } },
                            },
                        },
                        // supondo que o relacionamento na tabela cartItem seja "variant"
                        // que referencia a ProductVariant (modelo de variantes)
                        variant: {
                            select: {
                                id: true,
                                price_per: true,
                                productVariantImage: { take: 1, select: { url: true } },
                            },
                        },
                    },
                },
            },
        });

        if (!cart) {
            // cria carrinho vazio retornável
            return { id: "", items: [], subtotal: 0, shippingCost: 0, total: 0 };
        }

        // mapeia itens - usa dados da variante se existir, caso contrário do produto
        const items: CartItemDTO[] = (cart.items || []).map((ci: any) => {
            const variant = ci.variant ?? null;
            const product = ci.product ?? null;

            const price = variant?.price_per ?? product?.price_per ?? 0;
            const imageUrl =
                variant?.productVariantImage?.[0]?.url ?? product?.images?.[0]?.url ?? null;

            return {
                id: ci.id,
                product_id: ci.product_id,
                variant_id: variant?.id ?? null,
                name: product?.name ?? "Produto",
                price,
                quantity: ci.quantity,
                imageUrl,
            };
        });

        const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
        const shippingCost = cart.shippingCost ?? 0;
        const total = subtotal + shippingCost;

        return {
            id: cart.id,
            items,
            subtotal,
            shippingCost,
            total,
        };
    }

    /**
     * Adiciona produto (ou incrementa) no carrinho do user.
     * Agora aceita variantId opcional; a chave de unicidade do item é (cart_id, product_id, variant_id)
     */
    static async addItem(
        customer_id: string,
        productId: string,
        quantity = 1,
        variantId?: string | null
    ): Promise<CartDTO> {
        // garante carrinho
        let cart = await prismaClient.cart.upsert({
            where: { customer_id: customer_id },
            create: {
                customer_id: customer_id,
                subtotal: 0,
                total: 0,
                shippingCost: 0,
            },
            update: {},
        });

        // verifica se já existe item --- inclui variant_id na busca (pode ser null)
        const existing = await prismaClient.cartItem.findFirst({
            where: {
                cart_id: cart.id,
                product_id: productId,
                variant_id: variantId ?? null,
            },
        });

        if (existing) {
            await prismaClient.cartItem.update({
                where: { id: existing.id },
                data: { quantity: existing.quantity + quantity },
            });
        } else {
            // cria novo item com variant_id quando informado
            await prismaClient.cartItem.create({
                data: {
                    cart_id: cart.id,
                    product_id: productId,
                    variant_id: variantId ?? null,
                    quantity,
                },
            });
        }

        return this.getCart(customer_id);
    }

    // atualiza quantidade de um item
    static async updateItem(
        customer_id: string,
        itemId: string,
        quantity: number
    ): Promise<CartDTO> {
        // valida se pertence ao user
        const item = await prismaClient.cartItem.findUnique({
            where: { id: itemId },
            include: { cart: true },
        });
        if (!item || item.cart.customer_id !== customer_id) {
            throw new Error("Item não encontrado no seu carrinho");
        }

        await prismaClient.cartItem.update({
            where: { id: itemId },
            data: { quantity },
        });
        return this.getCart(customer_id);
    }

    // remove um item do carrinho
    static async removeItem(
        customer_id: string,
        itemId: string
    ): Promise<CartDTO> {
        const item = await prismaClient.cartItem.findUnique({
            where: { id: itemId },
            include: { cart: true },
        });
        if (!item || item.cart.customer_id !== customer_id) {
            throw new Error("Item não encontrado no seu carrinho");
        }

        await prismaClient.cartItem.delete({ where: { id: itemId } });
        return this.getCart(customer_id);
    }

    // esvazia o carrinho
    static async clearCart(customer_id: string): Promise<CartDTO> {
        const cart = await prismaClient.cart.findUnique({
            where: { customer_id: customer_id },
        });
        if (cart) {
            await prismaClient.cartItem.deleteMany({ where: { cart_id: cart.id } });
            // resetar frete/subtotal no registro (opcional)
            await prismaClient.cart.update({
                where: { id: cart.id },
                data: { subtotal: 0, total: 0, shippingCost: 0 },
            });
        }
        return this.getCart(customer_id);
    }
}