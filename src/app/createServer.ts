import { Server, reportDebug, middleware, Endpoint } from 'node-server-engine';
import * as endpoints from 'endpoints';
import { orderedEventLogsEndpoints } from 'endpoints/event-logs';
import express from 'express';
import path from 'path';

reportDebug.setNameSpace('~~namespace~~');

export function createServer(): Server {
  const otherEndpoints = Object.values(endpoints).filter(
    (e: any) => e && e.path && !e.path.includes('/event-logs')
  ) as Endpoint<any>[];

  const orderedEndpoints: Endpoint<any>[] = [
    ...orderedEventLogsEndpoints,
    ...otherEndpoints
  ];

  // Static middleware mounted under /uploads
  const uploadsMiddleware = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (req.path.startsWith('/uploads')) {
      req.url = req.url.replace('/uploads', '');
      express.static(path.join(process.cwd(), 'uploads'))(req, res, next);
    } else {
      next();
    }
  };

  return new Server({
    globalMiddleware: [
      middleware.swaggerDocs(),
      uploadsMiddleware // 👈 serves files at /uploads/*
    ],
    endpoints: orderedEndpoints
  });
}
 