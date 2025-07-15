import * as express from "express";

declare global {
    namespace Express {
        interface Request {
            userEcommerce_id?: string;
            name?: string;
            customer_id?: string;
            id_delete?: string;
        }
    }
}