import { NotificationType, Prisma } from "@prisma/client";
import prismaClient from "../../prisma";
import * as XLSX from 'xlsx';

class ExportDataService {
    private dateColumns = [
        'created_at', 'last_access', 'startDate', 'endDate',
        'abandonedAt', 'reminderSentAt', 'sentAt', 'pix_expiration',
        'publish_at_start', 'publish_at_end'
    ];

    private async getModelFields(modelName: string): Promise<string[]> {
        // @ts-ignore - Acesso dinâmico seguro
        const model = prismaClient[modelName];
        if (!model) throw new Error(`Tabela ${modelName} não encontrada`);

        // Exemplo genérico (ajuste conforme seus modelos)
        const sample = await model.findFirst({});
        return sample ? Object.keys(sample) : [];
    }

    private formatDate(value: any): string {
        if (!value) return 'N/A';
        const date = new Date(value);
        return isNaN(date.getTime()) ? String(value) : date.toLocaleString('pt-BR');
    }

    async execute(
        userEcommerce_id: string,
        tableName: string,
        columns: string[],
        format: 'xlsx' | 'csv',
        customColumnNames: { [key: string]: string }
    ) {
        try {
            // Validação das colunas
            const validColumns = await this.getModelFields(tableName);
            const invalidColumns = columns.filter(col => !validColumns.includes(col));

            if (invalidColumns.length > 0) {
                throw new Error(`Colunas inválidas: ${invalidColumns.join(', ')}`);
            }

            // Consulta dinâmica
            // @ts-ignore - Acesso dinâmico seguro
            const data = await prismaClient[tableName].findMany({
                select: columns.reduce((acc, col) => ({ ...acc, [col]: true }), {}),
            });

            // Formatação dos dados
            const formattedData = data.map((item: { [x: string]: any; }) => {
                const formattedItem: { [key: string]: any } = {};
                columns.forEach(col => {
                    let value = item[col];
                    formattedItem[customColumnNames[col] || col] = this.dateColumns.includes(col)
                        ? this.formatDate(value)
                        : value;
                });
                return formattedItem;
            });

            // Geração do arquivo
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(formattedData);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');
            const buffer = XLSX.write(workbook, { bookType: format, type: 'buffer' });

            // Notificação
            await prismaClient.notificationUserEcommerce.create({
                data: {
                    userEcommerce_id,
                    message: `Dados de ${tableName} exportados`,
                    type: NotificationType.REPORT,
                }
            });

            return {
                buffer,
                mimeType: format === 'xlsx'
                    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    : 'text/csv',
                extension: format
            };

        } catch (error: any) {
            console.error(`Erro na exportação de ${tableName}:`, error);
            throw new Error(error.message || 'Erro interno');
        }
    }
}

export { ExportDataService };