import { Request, Response } from "express";
import { AllCustomerService } from "../../../services/users/customers/AllCustomerService"; 
import { Prisma } from "@prisma/client";

class AllCustomerController {
    async handle(req: Request, res: Response) {
        const { 
            page = 1, 
            limit = 5, 
            search = "", 
            orderBy = "created_at", 
            orderDirection = "desc",
            startDate,
            endDate
        } = req.query;

        const allUsers = new AllCustomerService();
        const users = await allUsers.execute(
            Number(page),
            Number(limit),
            String(search),
            String(orderBy),
            orderDirection as Prisma.SortOrder,
            startDate ? String(startDate) : undefined,
            endDate ? String(endDate) : undefined
        );

        res.json(users);
    }
}

export { AllCustomerController };