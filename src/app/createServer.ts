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
      // Create a copy of the URL to modify
      // const originalUrl = req.url;
      req.url = req.url.replace(/^\/uploads/, '');
      
      // console.log(`[Static] Serving ${originalUrl} -> ${req.url} from uploads folder`);
      
      return express.static(path.join(process.cwd(), 'uploads'))(req, res, next);
    }
    next();
  };

  return new Server({
    globalMiddleware: [
      middleware.swaggerDocs(),
      uploadsMiddleware // 👈 serves files at /uploads/*
    ],
    endpoints: orderedEndpoints
  });
}
 