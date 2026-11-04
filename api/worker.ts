/**
 * The public API: src/server.ts at the edge, as a Cloudflare Worker.
 * Deployed by .github/workflows/release.yml with every release, so it
 * always answers with the version on npm. Nothing is logged or stored.
 */
import { respond } from '../src/server.js';

export default {
  fetch(request: Request): Response {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, OPTIONS', 'access-control-max-age': '86400' } });
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response(JSON.stringify({ error: 'GET only' }), { status: 405, headers: { 'content-type': 'application/json; charset=utf-8', allow: 'GET, OPTIONS' } });
    }
    const { status, body, headers } = respond(new URL(request.url));
    return new Response(request.method === 'HEAD' ? null : body, { status, headers });
  },
};
