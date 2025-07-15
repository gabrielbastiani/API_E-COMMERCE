import prismaClient from "../../prisma";

export interface CartItemDTO {
    id: string;
    product_id: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string;
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
        // busca cart e items
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
                    },
                },
            },
        });

        if (!cart) {
            // cria carrinho vazio
            return { id: "", items: [], subtotal: 0, shippingCost: 0, total: 0 };
        }

        // mapeia itens
        const items: CartItemDTO[] = cart.items.map((ci) => ({
            id: ci.id,
            product_id: ci.product_id,
            name: ci.product.name,
            price: ci.product.price_per,
            quantity: ci.quantity,
            imageUrl: ci.product.images[0]?.url,
        }));

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

    // adiciona produto (ou incrementa) no carrinho do user
    static async addItem(
        customer_id: string,
        productId: string,
        quantity = 1
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

        // verifica se já existe item
        const existing = await prismaClient.cartItem.findFirst({
            where: { cart_id: cart.id, product_id: productId },
        });

        if (existing) {
            await prismaClient.cartItem.update({
                where: { id: existing.id },
                data: { quantity: existing.quantity + quantity },
            });
        } else {
            await prismaClient.cartItem.create({
                data: {
                    cart_id: cart.id,
                    product_id: productId,
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
            // opcional: resetar frete/subtotal no registro
            await prismaClient.cart.update({
                where: { id: cart.id },
                data: { subtotal: 0, total: 0, shippingCost: 0 },
            });
        }
        return this.getCart(customer_id);
    }
}