import multer from "multer";
import path from "path";
import fs from "fs";

// pasta de uploads para comentários
const UPLOAD_DIR = path.join(process.cwd(), "../../images/commentAttachment");

// cria pasta se não existir
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (_req, _file, cb) {
        cb(null, UPLOAD_DIR);
    },
    filename: function (_req, file, cb) {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname);
        const safeName = file.originalname.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_\.-]/g, "");
        cb(null, `${unique}-${safeName}${ext}`);
    },
});

function fileFilter(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
    // permitir imagens e documentos comuns (jpg,png,pdf,docx,xlsx,txt)
    const allowed = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
    ];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Tipo de arquivo não permitido"));
    }
}

export const uploadCommentFiles = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // max 10MB por arquivo
        files: 5, // max 5 arquivos por upload
    },
    fileFilter,
});