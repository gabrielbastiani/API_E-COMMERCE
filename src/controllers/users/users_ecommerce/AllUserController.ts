import { Request, Response } from "express";
import { AllUsersService } from "../../../services/users/users_ecommerce/AllUsersService"; 
import { Prisma } from "@prisma/client";

class AllUserController {
    async handle(req: Request, res: Response) {
        const { 
            page = 1, 
            limit = 5, 
            search = "", 
            orderBy = "created_at", 
            orderDirection = "desc",
            startDate,
            endDate,
            userEcommerce_id
        } = req.query;

        const allUsers = new AllUsersService();
        const users = await allUsers.execute(
            Number(page),
            Number(limit),
            String(search),
            String(orderBy),
            orderDirection as Prisma.SortOrder,
            startDate ? String(startDate) : undefined,
            endDate ? String(endDate) : undefined,
            String(userEcommerce_id)
        );

        res.json(users);
    }
}

export { AllUserController };