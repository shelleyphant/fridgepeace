const SESSION_CACHE_KEY = 'https://off-session-cache/v1';

async function getOffSession(env) {
  const cache = caches.default;
  const cached = await cache.match(SESSION_CACHE_KEY);
  if (cached) return await cached.text();

  const body = new URLSearchParams({
    user_id: env.OFF_USER,
    password: env.OFF_PASSWORD,
    action: 'process',
  });

  const res = await fetch('https://world.openfoodfacts.org/cgi/session.pl', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    redirect: 'manual',
  });

  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    const cookie = setCookie.split(';')[0];
    await cache.put(SESSION_CACHE_KEY, new Response(cookie, {
      headers: { 'Cache-Control': 'max-age=3600' },
    }));
    return cookie;
  }
  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/off-proxy')) {
      const offUrl = 'https://world.openfoodfacts.org' + url.pathname.replace('/off-proxy', '') + url.search;
      const headers = new Headers();
      const contentType = request.headers.get('content-type');
      if (contentType) headers.set('content-type', contentType);

      const session = await getOffSession(env);
      if (session) headers.set('cookie', session);

      return fetch(offUrl, {
        method: request.method,
        headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
        redirect: 'follow',
      });
    }

    return env.ASSETS.fetch(request);
  }
}
