// ============================================================
// Cloudflare Worker — aggregate API proxy
//
// Purpose:
//   Forwards POST /api/aggregate from the internal facilitator deck
//   to the Supabase edge function, injecting the service-role key
//   server-side so it's never exposed to the browser.
//
// Routes handled:
//   OPTIONS /api/aggregate  → CORS preflight (same-origin, so usually empty)
//   POST    /api/aggregate  → forward to Supabase
//   *                       → 404
//
// Environment variables (set in Cloudflare dashboard → Worker → Settings):
//   SUPABASE_FUNCTIONS_URL    e.g. https://supabase-andqfive-u72683.vm.elestio.app/functions/v1
//   SUPABASE_SERVICE_ROLE_KEY the long JWT from Supabase dashboard (keep secret)
//   ALLOWED_ORIGIN            e.g. https://readyneering-evaluation-e8t.pages.dev
//                             (the worker rejects requests from other origins)
//
// Optional Cloudflare Access integration:
//   If Cloudflare Access protects the deck's domain, every request reaching
//   the worker carries a CF-Access-Jwt-Assertion header. Uncomment the
//   verifyAccess() block below to require it.
// ============================================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Only handle our one route. Everything else is a 404 so the worker
    // can coexist with other routes on the same domain.
    if (url.pathname !== '/api/aggregate') {
      return new Response('Not found', { status: 404 });
    }

    // CORS preflight. Same-origin in normal use, but handle it defensively
    // in case the deck is opened from a preview URL during dev.
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env, request) });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, env, request);
    }

    // Optional: enforce Cloudflare Access. Uncomment if the deck's domain
    // is protected by Access and you want the worker to refuse direct hits.
    //
    // const accessOk = await verifyAccess(request, env);
    // if (!accessOk) return json({ error: 'Unauthorized' }, 401, env, request);

    // Validate environment
    if (!env.SUPABASE_FUNCTIONS_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: 'Worker not configured' }, 500, env, request);
    }

    // Read the body once (we need to forward it verbatim)
    let body;
    try {
      body = await request.text();
    } catch {
      return json({ error: 'Invalid request body' }, 400, env, request);
    }

    // Cap body size to defend against accidental huge POSTs
    if (body.length > 50_000) {
      return json({ error: 'Payload too large' }, 413, env, request);
    }

    // Forward to Supabase with the service-role key injected
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

    // Stream the upstream response back. Preserve status code so the deck
    // can distinguish 200/400/429 etc. Copy JSON body verbatim — don't reshape.
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

// ---- Helpers --------------------------------------------------

function corsHeaders(env, request) {
  // Echo a specific allowed origin (not *) so this works even if the deck
  // ever sets credentials: 'include' for some reason.
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

// ---- Optional: Cloudflare Access verification ------------------
//
// If the deck's domain is protected by Cloudflare Access, every legitimate
// request carries a signed JWT in CF-Access-Jwt-Assertion. Verifying it
// proves the user came through your Access policy.
//
// Set CF_ACCESS_TEAM_DOMAIN (e.g. "andqfive.cloudflareaccess.com") and
// CF_ACCESS_AUD (the application audience tag from Access settings) as
// worker env vars to enable.
//
// async function verifyAccess(request, env) {
//   if (!env.CF_ACCESS_TEAM_DOMAIN || !env.CF_ACCESS_AUD) return true; // not configured = skip
//   const token = request.headers.get('Cf-Access-Jwt-Assertion');
//   if (!token) return false;
//
//   // Fetch JWKS from your team's Access endpoint
//   const jwks = await fetch(`https://${env.CF_ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`)
//     .then(r => r.json()).catch(() => null);
//   if (!jwks?.keys) return false;
//
//   // Verify signature + claims. Use a JOSE library (jose works in workers).
//   // import * as jose from 'jose';
//   // try {
//   //   const { payload } = await jose.jwtVerify(token, jose.createLocalJWKSet(jwks), {
//   //     issuer: `https://${env.CF_ACCESS_TEAM_DOMAIN}`,
//   //     audience: env.CF_ACCESS_AUD,
//   //   });
//   //   return !!payload.sub;
//   // } catch { return false; }
//
//   return true;
// }
