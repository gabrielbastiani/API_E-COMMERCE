import fs from 'fs';
import path from 'path';

class DeleteFilesExcelService {
    async execute(): Promise<{ message: string }> {
        const directory = path.join(__dirname, '../../../temp_file');

        try {
            if (!fs.existsSync(directory)) {
                return { message: "A pasta temp_file não existe." };
            }

            const files = fs.readdirSync(directory);

            for (const file of files) {
                fs.unlinkSync(path.join(directory, file));
            }

            return { message: "Todos os arquivos foram deletados com sucesso." };
        } catch (error) {
            console.error("Erro ao deletar arquivos:", error);
            throw new Error("Erro ao deletar arquivos da pasta temp_file");
        }
    }
}

export { DeleteFilesExcelService };