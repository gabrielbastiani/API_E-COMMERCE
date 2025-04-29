import { NotificationType } from "@prisma/client";
import prismaClient from "../../prisma";
import * as XLSX from 'xlsx';

class ExportDataService {

    // Lista de colunas que devem ser formatadas como data
    private dateColumns = [
        'created_at', 'last_access', 'startDate', 'endDate',
        'abandonedAt', 'reminderSentAt', 'sentAt', 'pix_expiration',
        'publish_at_start', 'publish_at_end'
    ];

    private formatDate(value: any): string {
        if (!value) return 'N/A';

        const date = new Date(value);
        if (isNaN(date.getTime())) return String(value); // Se não for data válida

        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    async execute(userEcommerce_id: string, tableName: string, columns: string[], format: 'xlsx' | 'csv', customColumnNames: { [key: string]: string }) {
        try {
            // Mapeamento de relacionamentos específicos
            const includeMap: { [key: string]: any } = {
                userEcommerce: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        status: true,
                        role: true,
                        created_at: true
                    }
                },
                product: {
                    include: {
                        categories: { include: { category: true } },
                        images: true,
                        variants: { include: { variantAttribute: true } },
                        mainPromotion: true
                    }
                },
                order: {
                    include: {
                        customer: true,
                        items: { include: { product: true } },
                        promotion: true
                    }
                }
            };

            // Filtro para UserEcommerce
            const filter = tableName === 'userEcommerce' ? {
                role: { in: ["ADMIN", "EMPLOYEE"] },
                id: { not: userEcommerce_id }
            } : {};

            // Configuração da query
            const queryOptions = {
                where: filter,
                ...(includeMap[tableName] || {})
            };

            // Acesso dinâmico seguro ao modelo Prisma
            const prismaModel = (prismaClient as any)[tableName];
            if (!prismaModel) {
                throw new Error(`Modelo ${tableName} não encontrado`);
            }

            // Executa a query
            const dataExport = await prismaModel.findMany(queryOptions);

            if (!dataExport?.length) {
                throw new Error('Nenhum dado encontrado para exportação');
            }

            // Formatação dos dados
            const formattedData = dataExport.map((item: { [x: string]: any; }) => {
                const formattedItem: { [key: string]: any } = {};
                columns.forEach(col => {
                    let value = item[col];

                    // Formatação especial para colunas de data
                    if (this.dateColumns.includes(col)) {
                        value = this.formatDate(value);
                    }
                    // Formatação para outros objetos
                    else if (typeof value === 'object' && value !== null) {
                        value = JSON.stringify(value);
                    }

                    formattedItem[customColumnNames[col] || col] = value;
                });
                return formattedItem;
            });

            // Geração do arquivo
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(formattedData);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');
            const buffer = XLSX.write(workbook, { bookType: format, type: 'buffer' });

            // Cria notificação
            await prismaClient.notificationUserEcommerce.create({
                data: {
                    userEcommerce_id,
                    message: "Exportação realizada com sucesso",
                    type: NotificationType.REPORT
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
            console.error('Erro na exportação:', error);
            throw new Error(error.message || 'Erro interno na exportação');
        }
    }
}

export { ExportDataService };