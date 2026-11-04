/**
 * The HTTP API on Node, for a machine of your own: `npm run serve`
 * (http://localhost:8787; PORT=9000 to choose). The routes and the handler
 * are src/server.ts — the same the public API serves at the edge
 * (api/worker.ts). Nothing is logged or stored.
 */
import http from 'node:http';
import { respond } from '../src/server.js';

const PORT = Number(process.env.PORT ?? 8787);

http
  .createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const { status, body, headers } = respond(url);
    res.writeHead(status, headers);
    res.end(body);
  })
  .listen(PORT, () => console.log(`mihrab-methods on http://localhost:${PORT}/v1/times?authority=algeria&lat=36.75&lng=3.06&date=2026-10-15`));
