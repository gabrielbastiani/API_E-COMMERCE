import prismaClient from "../../prisma";
import * as XLSX from "xlsx";
import fs from "fs";
import { NotificationType, Role } from "@prisma/client";
import path from "path";

class BulkDeleteMarketingPublicationService {
    async execute(filePath: string, userEcommerce_id: string) {
        try {
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            const data = XLSX.utils.sheet_to_json<{ Nome?: string }>(worksheet);

            const publicationToDelete = data
                .map(publication => publication.Nome)
                .filter(title => title !== undefined && title !== null);

            const publications = await prismaClient.marketingPublication.findMany({
                where: {
                    title: {
                        in: publicationToDelete
                    }
                }
            });

            const users_crate = await prismaClient.userEcommerce.findUnique({
                where: {
                    id: userEcommerce_id
                }
            });

            const users_superAdmins = await prismaClient.userEcommerce.findMany({
                where: {
                    role: Role.SUPER_ADMIN
                }
            });

            const all_user_ids = [
                ...users_superAdmins.map(userEcommerce => userEcommerce.id)
            ];

            const notificationsData = all_user_ids.map(userEcommerce_id => ({
                userEcommerce_id,
                message: `Publicação de marketing deletada(s) via planilha pelo usuario ${users_crate?.name}`,
                type: NotificationType.MARKETING
            }));

            publications.forEach((publication) => {
                if (publication.image_url) {
                    const imagePath = path.resolve(__dirname + '/' + '..' + '/' + '..' + '/' + '..' + '/' + 'images' + '/' + 'marketing' + '/' + publication.image_url);
                    fs.unlink(imagePath, (err) => {
                        if (err) {
                            console.error(`Failed to delete image for publication ${publication.id}: ${err.message}`);
                        } else {
                            console.log(`Image for marketingPublication ${publication.id} deleted successfully`);
                        }
                    });
                }
            });

            const delete_publications = await prismaClient.marketingPublication.deleteMany({
                where: {
                    title: { in: publicationToDelete },
                },
            });

            await prismaClient.notificationUserEcommerce.createMany({
                data: notificationsData
            });

            return delete_publications;

        } finally {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
    }
}

export { BulkDeleteMarketingPublicationService };