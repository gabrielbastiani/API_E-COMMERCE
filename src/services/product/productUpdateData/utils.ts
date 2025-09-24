import fs from "fs";
import path from "path";

export const IMAGES_DIR = path.join(process.cwd(), "images");

export function slugify(s: string) {
    return s
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/ +/g, "-")
        .replace(/-{2,}/g, "-")
        .replace(/\//g, "-");
}

/**
 * Remove uma lista de arquivos do disco. Não lança (apenas loga),
 * para não quebrar a transação por erro de FS.
 */
export function removeFilesFromDisk(filePaths: string[]) {
    filePaths.forEach((filePath) => {
        try {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (err) {
            console.warn("[utils.removeFilesFromDisk] failed removing file:", filePath, err);
        }
    });
}