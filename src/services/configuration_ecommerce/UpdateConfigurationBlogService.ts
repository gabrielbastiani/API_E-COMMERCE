import prismaClient from '../../prisma';
import fs from 'fs';
import path from 'path';

interface ConfigBlog {
    configurationBlog_id: string;
    name_blog?: string;
    description_blog?: string;
    logo?: string;
    favicon?: string;
    phone?: string;
    email_blog?: string;
    author_blog?: string;
    about_author_blog?: string;
    privacy_policies?: string;
}

class UpdateConfigurationBlogService {
    async execute({
        configurationBlog_id,
        name_blog,
        description_blog,
        logo,
        favicon,
        phone,
        email_blog,
        author_blog,
        about_author_blog,
        privacy_policies
    }: ConfigBlog) {

        const ecommerceData = await prismaClient.ecommerceData.findUnique({
            where: { id: configurationBlog_id }
        });

        const dataToUpdate: any = {};

        if (name_blog) {
            dataToUpdate.name_blog = name_blog;
        }

        if (privacy_policies) {
            dataToUpdate.privacy_policies = privacy_policies;
        }

        if (description_blog) {
            dataToUpdate.description_blog = description_blog;
        }

        if (about_author_blog) {
            dataToUpdate.about_author_blog = about_author_blog;
        }

        if (logo) {
            if (ecommerceData?.logo) {
                const imagePath = path.resolve(__dirname + '/' + '..' + '/' + '..' + '/' + '..' + '/' + 'images' + '/' + ecommerceData?.logo);
                console.log(`Deleting image: ${imagePath}`);
                fs.unlink(imagePath, (err) => {
                    if (err) {
                        console.error(`Failed to delete old image: ${err.message}`);
                    } else {
                        console.log('Old image deleted successfully');
                    }
                });
            }
            dataToUpdate.logo = logo;
        }

        if (favicon) {
            if (ecommerceData?.favicon) {
                const imagePath = path.resolve(__dirname + '/' + '..' + '/' + '..' + '/' + '..' + '/' + 'images' + '/' + ecommerceData?.favicon);
                console.log(`Deleting image: ${imagePath}`);
                fs.unlink(imagePath, (err) => {
                    if (err) {
                        console.error(`Failed to delete old image: ${err.message}`);
                    } else {
                        console.log('Old image deleted successfully');
                    }
                });
            }
            dataToUpdate.favicon = favicon;
        }

        if (phone) {
            dataToUpdate.phone = phone;
        }

        if (email_blog) {
            dataToUpdate.email_blog = email_blog;
        }

        if (author_blog) {
            dataToUpdate.author_blog = author_blog;
        }

        const update_Configs = await prismaClient.ecommerceData.update({
            where: {
                id: configurationBlog_id
            },
            data: dataToUpdate
        });

        return update_Configs;
    }
}

export { UpdateConfigurationBlogService };