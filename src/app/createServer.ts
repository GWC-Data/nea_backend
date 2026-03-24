import {Server, reportDebug, middleware} from 'node-server-engine';
import * as endpoints from 'endpoints';

reportDebug.setNameSpace('~~namespace~~');

/** Initialize the server */
export function createServer(): Server {
  return new Server({
    globalMiddleware: [middleware.swaggerDocs()],
    endpoints: Object.values(endpoints)
  });
}
