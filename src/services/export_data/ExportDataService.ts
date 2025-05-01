import { NotificationType } from "@prisma/client";
import prismaClient from "../../prisma";
import * as XLSX from 'xlsx';

class ExportDataService {
    private dateColumns = [
        'created_at', 'last_access', 'startDate', 'endDate',
        'abandonedAt', 'reminderSentAt', 'sentAt', 'pix_expiration',
        'publish_at_start', 'publish_at_end'
    ];

    private formatDate(value: any): string {
        if (!value) return 'N/A';
        const date = new Date(value);
        return isNaN(date.getTime()) ? String(value) : date.toLocaleString('pt-BR');
    }

    private formatRelation(value: any, tableName: string, column: string): string {
        if (!Array.isArray(value)) return String(value);

        // Casos específicos de relacionamentos conhecidos
        switch (tableName) {
            case 'category':
                if (column === 'children') {
                    return value.map((child: any) => child.name).join(', ');
                }
                break;
            // Adicione outros casos conforme necessário
        }

        return JSON.stringify(value);
    }

    async execute(
        userEcommerce_id: string,
        tableName: string,
        columns: string[],
        format: 'xlsx' | 'csv',
        customColumnNames: { [key: string]: string }
    ) {
        try {
            // Construir objeto de seleção dinâmico
            const select = columns.reduce((acc: any, col) => {
                acc[col] = true;
                return acc;
            }, {});

            // @ts-ignore - Acesso dinâmico seguro
            const data = await prismaClient[tableName].findMany({ select });

            // Formatar dados
            const formattedData = data.map((item: { [x: string]: any; }) => {
                const formattedItem: { [key: string]: any } = {};
                columns.forEach(col => {
                    let value = item[col];

                    // Formatar datas
                    if (this.dateColumns.includes(col)) {
                        value = this.formatDate(value);
                    }
                    // Formatar relacionamentos
                    else if (typeof value === 'object') {
                        value = this.formatRelation(value, tableName, col);
                    }

                    formattedItem[customColumnNames[col] || col] = value;
                });
                return formattedItem;
            });

            // Gerar arquivo
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(formattedData);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');
            const buffer = XLSX.write(workbook, { bookType: format, type: 'buffer' });

            // Criar notificação
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
            throw new Error(error.message || 'Coluna inválida ou erro interno');
        }
    }
}

export { ExportDataService };