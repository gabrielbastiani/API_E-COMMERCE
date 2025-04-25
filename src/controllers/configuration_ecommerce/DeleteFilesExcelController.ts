import { Request, Response } from 'express';
import { DeleteFilesExcelService } from '../../services/configuration_ecommerce/DeleteFilesExcelService';  

class DeleteFilesExcelController {
    async handle(req: Request, res: Response) {

        const delete_files = new DeleteFilesExcelService();

        const files_delete = await delete_files.execute();

        res.json(files_delete);
    }
}

export { DeleteFilesExcelController };