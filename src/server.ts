import 'express-async-errors';
import express, { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import cors from 'cors';
import path from 'path';
import cron from 'node-cron';
import { router } from './routes';
import { StartMarketingPublicationScheduler } from './services/marketing_publication/StartMarketingPublicationScheduler';
import { EndMarketingPublicationScheduler } from './services/marketing_publication/EndMarketingPublicationScheduler';
import { StartPromotionScheduler } from './services/promotion/StartPromotionScheduler';
import { EndPromotionScheduler } from './services/promotion/EndPromotionScheduler';

const startSchedulerPublication = new StartMarketingPublicationScheduler();
const endSchedulerPublication = new EndMarketingPublicationScheduler();
const startSchedulerPromotion = new StartPromotionScheduler();
const endSchedulerPromotion = new EndPromotionScheduler();

const app = express();

// Type augmentation para rawBody (Buffer)
declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

const PORT = process.env.PORT ? Number(process.env.PORT) : 3333;

// Captura raw body globalmente (útil para HMAC sem ambiguidade)
app.use(express.json({
  limit: '10mb',
  verify: (req: any, _res, buf: Buffer) => {
    // armazenamos o Buffer diretamente
    req.rawBody = buf;
  }
}));

app.use("/webhooks", router);

app.set('trust proxy', true);

// Headers / CORS
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', process.env.URL_ECOMMERCE || '*');
  res.header('Access-Control-Allow-Methods', 'GET, PATCH, POST, DELETE, PUT, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Asaas-Signature, asaas-signature, X-Requested-With');
  next();
});

app.use(cors());

// Rotas
app.use(router);

// Servir arquivos estáticos
app.use('/files', express.static(path.resolve(__dirname, '..', 'images')));
app.use("/commentAttachment", express.static(path.join(process.cwd(), "commentAttachment")));

// Error handler
const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  if (err instanceof Error) {
    console.error('Erro capturado pelo errorHandler:', err.message);
    res.status(400).json({ error: err.message });
    return;
  }
  res.status(500).json({
    status: 'error',
    message: 'Internal server error.'
  });
};

app.use(errorHandler);

// Agendamentos (mantive sua lógica)
cron.schedule("* * * * *", async () => {
  try {
    await startSchedulerPublication.execute();
    await startSchedulerPromotion.execute();

    setTimeout(async () => {
      await endSchedulerPublication.execute();
      await endSchedulerPromotion.execute();
    }, 10000);
  } catch (err) {
    console.error('Erro no cron jobs:', err);
  }
});

const server = app.listen(PORT, () => console.log(`Servidor online na porta ${PORT} !!!!`));

// Timeout do servidor (30s)
server.setTimeout(30000);