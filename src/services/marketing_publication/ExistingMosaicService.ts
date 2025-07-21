import { Position, StatusMarketingPublication } from "@prisma/client";
import prismaClient from "../../prisma";

interface MosaicProps {
    local: string;
}

class ExistingMosaicService {
    async execute({ local }: MosaicProps) {
        const mosaicPublication = await prismaClient.marketingPublication.findMany({
            where: {
                local: local,
                position: Position.MOSAICO,
                OR: [
                    { status: StatusMarketingPublication.Disponivel },
                    { status: StatusMarketingPublication.Disponivel_programado }
                ]
            }
        });
        return mosaicPublication;
    }
}

export { ExistingMosaicService };