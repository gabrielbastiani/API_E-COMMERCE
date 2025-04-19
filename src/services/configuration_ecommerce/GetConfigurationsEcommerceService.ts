import prismaClient from "../../prisma";

class GetConfigurationsEcommerceService {
    async execute() {

        const config = await prismaClient.ecommerceData.findFirst();

        return config;

    }
}

export { GetConfigurationsEcommerceService }