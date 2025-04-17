import { Role } from "@prisma/client";
import prismaClient from "../../../prisma";

class SuperUserPublicService {
    async execute() {

        const user = await prismaClient.userEcommerce.findMany({
            where: {
                role: Role.SUPER_ADMIN
            }
        });

        return user;

    }
}

export { SuperUserPublicService }