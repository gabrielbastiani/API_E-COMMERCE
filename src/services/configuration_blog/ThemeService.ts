import prismaClient from "../../prisma"; 

class ThemeService {
    async getThemeSettings() {
        const settings = await prismaClient.themeSettings.findFirst();
        return settings?.colors || {};
    }

    async updateThemeSettings(colors: Record<string, string>) {
        const existing = await prismaClient.themeSettings.findFirst();

        if (existing) {
            return await prismaClient.themeSettings.update({
                where: { id: existing.id },
                data: { colors }
            });
        }

    }

}

export { ThemeService };