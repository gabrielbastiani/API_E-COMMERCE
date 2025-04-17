import { Request, Response } from 'express';
import { IntervalUpdateDataService } from '../../services/marketing_publication/IntervalUpdateDataService';

class IntervalUpdateDataController {
    async handle(req: Request, res: Response) {

        const bannerInterval_id = req.query.bannerInterval_id as string;

        const {
            local_site,
            label_local_site,
            interval_banner,
            label_interval_banner
        } = req.body;

        const update_interval = new IntervalUpdateDataService();
        const interval = interval_banner && !isNaN(Number(interval_banner)) ? Number(interval_banner) : undefined;

        const intervals = await update_interval.execute({
            bannerInterval_id,
            local_site,
            label_local_site,
            interval_banner: interval,
            label_interval_banner
        });

        res.json(intervals);
    }
}

export { IntervalUpdateDataController };