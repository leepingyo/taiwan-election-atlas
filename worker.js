export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/2026') {
      if (!['GET', 'HEAD'].includes(request.method)) {
        return new Response('Method not allowed', {status: 405, headers: {Allow: 'GET, HEAD'}});
      }
      url.pathname = '/data/cec-2026.json';
      url.search = '';
      const asset = await env.ASSETS.fetch(new Request(url, {method: request.method}));
      const headers = new Headers(asset.headers);
      headers.set('Content-Type', 'application/json; charset=utf-8');
      headers.set('Cache-Control', 'public, max-age=300');
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('X-Data-Mode', 'cec-registration-snapshot');
      return new Response(asset.body, {status: asset.status, headers});
    }
    return env.ASSETS.fetch(request);
  }
};
