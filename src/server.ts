import 'express-async-errors';
import express, { Request, Response, NextFunction, ErrorRequestHandler, json } from 'express';
import cors from 'cors';
import { router } from './routes';
import path from 'path';
import cron from "node-cron";
import { StartMarketingPublicationScheduler } from './services/marketing_publication/StartMarketingPublicationScheduler';
import { EndMarketingPublicationScheduler } from './services/marketing_publication/EndMarketingPublicationScheduler';
import { StartPromotionScheduler } from './services/promotion/StartPromotionScheduler';
import { EndPromotionScheduler } from './services/promotion/EndPromotionScheduler';

const startSchedulerPublication = new StartMarketingPublicationScheduler();
const endSchedulerPublication = new EndMarketingPublicationScheduler();
const startSchedulerPromotion = new StartPromotionScheduler();
const endSchedulerPromotion = new EndPromotionScheduler();

const app = express();

app.use((req, res, next) => {
    res.setTimeout(30000, () => {
        console.log('Request has timed out.');
        res.status(408).send('Timeout');
    });
    next();
});

// Configuração otimizada do body parser
app.use(json({
    limit: '10mb',
    verify: (req: any, res, buf) => {
        req.rawBody = buf.toString();
    }
}));

app.set('trust proxy', true);

app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', process.env.URL_ECOMMERCE);
    res.header('Access-Control-Allow-Methods', 'GET, PATCH, POST, DELETE, PUT');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

app.use(cors());
app.use(express.json());

app.use(router);

app.use(
    '/files',
    express.static(path.resolve(__dirname, '..', 'images'))
);

// Middleware de erros corrigido
const errorHandler: ErrorRequestHandler = (
    err: unknown,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
    }

    res.status(500).json({
        status: 'error',
        message: 'Internal server error.'
    });
};

app.use(errorHandler);

cron.schedule("* * * * *", async () => {
    await startSchedulerPublication.execute();
    await startSchedulerPromotion.execute();

    setTimeout(async () => {
        await endSchedulerPublication.execute();
        await endSchedulerPromotion.execute();
    }, 10000);
});

const server = app.listen(process.env.PORT || 3333, () => console.log('Servidor online!!!!'));

server.setTimeout(30000);