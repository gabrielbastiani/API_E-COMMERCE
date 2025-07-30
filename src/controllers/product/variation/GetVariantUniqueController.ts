import { Request, Response } from "express";
import { GetVariantUniqueService } from "../../../services/product/variation/GetVariantUniqueService";

class GetVariantUniqueController {
    async handle(req: Request, res: Response) {

        const variant_id = req.query.variant_id as string;

        const variantData = new GetVariantUniqueService();

        const variante = await variantData.execute({ variant_id });

        res.json(variante);
    }
}

export { GetVariantUniqueController }