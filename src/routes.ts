import { Router } from "express";
import multer from 'multer';
import uploadConfig from './config/multer';
import { checkRole } from "./middlewares/checkRole";

const router = Router();




export { router }