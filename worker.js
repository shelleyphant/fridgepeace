export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/off-proxy')) {
      const offUrl = 'https://world.openfoodfacts.org' + url.pathname.replace('/off-proxy', '') + url.search;
      const headers = new Headers();
      const forward = ['content-type', 'accept', 'accept-language', 'cookie', 'authorization'];
      for (const key of forward) {
        const val = request.headers.get(key);
        if (val) headers.set(key, val);
      }
      return fetch(offUrl, {
        method: request.method,
        headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      });
    }

    return env.ASSETS.fetch(request);
  }
}
