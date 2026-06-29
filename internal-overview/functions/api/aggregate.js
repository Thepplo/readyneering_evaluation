
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname !== '/api/aggregate') {
      return new Response('Not found', { status: 404 });
    }
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env, request) });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, env, request);
    }

    if (!env.SUPABASE_FUNCTIONS_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: 'Worker not configured' }, 500, env, request);
    }

    let body;
    try {
      body = await request.text();
    } catch {
      return json({ error: 'Invalid request body' }, 400, env, request);
    }

    if (body.length > 50_000) {
      return json({ error: 'Payload too large' }, 413, env, request);
    }
    let upstream;
    try {
      upstream = await fetch(`${env.SUPABASE_FUNCTIONS_URL}/aggregate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body,
      });
    } catch (err) {
      console.error('Upstream fetch failed', err);
      return json({ error: 'Upstream unavailable' }, 502, env, request);
    }

    const upstreamText = await upstream.text();
    return new Response(upstreamText, {
      status: upstream.status,
      headers: {
        ...corsHeaders(env, request),
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  },
};

function corsHeaders(env, request) {
  const origin = request.headers.get('Origin');
  const allowed = env.ALLOWED_ORIGIN || '';
  const allowOrigin = origin === allowed ? origin : allowed;
  return {
    'Access-Control-Allow-Origin': allowOrigin || 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function json(data, status, env, request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(env, request),
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

