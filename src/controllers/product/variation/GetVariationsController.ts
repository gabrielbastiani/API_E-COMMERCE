import { Request, Response } from "express";
import { GetVariationsService } from "../../../services/product/variation/GetVariationsService";  

class GetVariationsController {
    async handle(req: Request, res: Response) {

        const variantsGet = new GetVariationsService();

        const variantes = await variantsGet.execute();

        res.json(variantes);
    }
}

export { GetVariationsController }