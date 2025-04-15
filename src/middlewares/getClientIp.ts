import { Request } from "express";

export function getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    return (
        (Array.isArray(forwarded) ? forwarded[0] : forwarded) ||
        req.socket.remoteAddress ||
        '127.0.0.1'
    );
}