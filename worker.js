export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/off-proxy')) {
      const offUrl = 'https://world.openfoodfacts.org' + url.pathname.replace('/off-proxy', '') + url.search;
      const headers = new Headers(request.headers);
      headers.delete('host');
      headers.delete('cf-connecting-ip');
      headers.delete('cf-ipcountry');
      headers.delete('cf-ray');
      headers.delete('cf-visitor');
      const offRequest = new Request(offUrl, {
        method: request.method,
        headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      });
      return fetch(offRequest);
    }

    return env.ASSETS.fetch(request);
  }
}
