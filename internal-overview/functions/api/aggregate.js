export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.SUPABASE_FUNCTIONS_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'Function not configured' }, 500);
  }

  let body;
  try {
    body = await request.text();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }
  if (body.length > 50_000) {
    return json({ error: 'Payload too large' }, 413);
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
    return json({ error: 'Upstream unavailable' }, 502);
  }

  const upstreamText = await upstream.text();
  return new Response(upstreamText, {
    status: upstream.status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}