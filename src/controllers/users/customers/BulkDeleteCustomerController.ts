import { Request, Response } from 'express';
import { BulkDeleteCustomerService } from '../../../services/users/customers/BulkDeleteCustomerService'; 
import multer from 'multer';

const upload = multer({ dest: 'temp_file/' }); // Diretório temporário para arquivos

class BulkDeleteCustomerController {
    async handle(req: Request, res: Response) {
        const userEcommerce_id = req.query.userEcommerce_id as string;
        const { file } = req;

        if (!file) {
            res.status(400).json({ error: "Arquivo Excel não fornecido" });
        }

        const service = new BulkDeleteCustomerService();

        try {
            const result = await service.execute(file!.path, userEcommerce_id);
            res.status(200).json({ message: "Usuários deletados com sucesso", result });
        } catch (error) {/* @ts-ignore */
            res.status(500).json({ error: "Erro ao deletar usuários", details: error.message });
        }
    }
}

export { BulkDeleteCustomerController, upload };