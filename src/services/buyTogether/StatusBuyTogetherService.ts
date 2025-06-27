import { StatusBuyTogether } from "@prisma/client";
import prismaClient from "../../prisma";

interface BuyTogetherProps {
    id: string;
    status: string;
}

class StatusBuyTogetherService {
    async execute({ id, status }: BuyTogetherProps) {

        console.log(id, status)
        
        const buy = await prismaClient.buyTogether.update({
            where: {
                id: id
            },
            data: {
                status: status as StatusBuyTogether
            }
        });

        return buy;

    }
}

export { StatusBuyTogetherService }