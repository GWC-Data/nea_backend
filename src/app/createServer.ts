import {Server, reportDebug, middleware, Endpoint} from 'node-server-engine';
import * as endpoints from 'endpoints';
import { orderedEventLogsEndpoints } from 'endpoints/event-logs';

reportDebug.setNameSpace('~~namespace~~');

/** Initialize the server */
export function createServer(): Server {
  // ✅ Build endpoints array ensuring specific routes come before generic ones
  // Get all endpoints except event-logs (which we'll add in correct order)
  const otherEndpoints = Object.values(endpoints).filter(
    (e: any) => e && e.path && !e.path.includes('/event-logs')
  ) as Endpoint<any>[];

  // Combine: ordered event-logs endpoints first, then all other endpoints
  const orderedEndpoints: Endpoint<any>[] = [
    ...orderedEventLogsEndpoints,
    ...otherEndpoints
  ];

  return new Server({
    globalMiddleware: [middleware.swaggerDocs()],
    endpoints: orderedEndpoints
  });
}
