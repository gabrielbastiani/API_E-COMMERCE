import { Request, Response } from 'express'
import { CustomerOrderService } from '../../../../services/users/customers/orders/CustomerOrderService';

class CustomerOrderController {
    async handle(req: Request, res: Response) {

        const customer_id = String(req.query.customer_id || "");

        // paginação
        const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
        const per_page = req.query.per_page ? parseInt(String(req.query.per_page), 10) : 10;

        // filtros possíveis
        const q = req.query.q ? String(req.query.q) : undefined;
        const sku = req.query.sku ? String(req.query.sku) : undefined;
        const paymentMethod = req.query.paymentMethod ? String(req.query.paymentMethod) : undefined;
        const status = req.query.status ? String(req.query.status) : undefined;
        const orderNumber = req.query.orderNumber ? String(req.query.orderNumber) : undefined;
        const date_from = req.query.date_from ? String(req.query.date_from) : undefined;
        const date_to = req.query.date_to ? String(req.query.date_to) : undefined;

        const ordersService = new CustomerOrderService();

        const result = await ordersService.execute({
            customer_id,
            page,
            per_page,
            q,
            sku,
            paymentMethod,
            status,
            orderNumber,
            date_from,
            date_to,
        });

        res.json(result);
    }
}

export { CustomerOrderController }