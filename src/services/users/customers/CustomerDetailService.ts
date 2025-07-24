import prismaClient from "../../../prisma"; 

interface UserRequest {
    customer_id: string;
}

class CustomerDetailService {
    async execute({ customer_id }: UserRequest) {
        const user = await prismaClient.customer.findFirst({
            where: {
                id: customer_id
            }
        });

        return user;

    }
}

export { CustomerDetailService }