import { createClient } from '@supabase/supabase-js';

const MAX_BODY_BYTES = 100_000;
const MAX_ITEMS = 300;
const MAX_RESPONSE_JSON_BYTES = 10_000;

function getAllowedOrigins(env) {
  return (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function getCorsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  const allowedOrigins = getAllowedOrigins(env);

  const allowOrigin =
    origin && allowedOrigins.includes(origin)
      ? origin
      : allowedOrigins[0] || 'null';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Idempotency-Key',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function json(request, env, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...getCorsHeaders(request, env),
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

function publicError(request, env, message, status = 400) {
  return json(request, env, { error: message }, status);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function jsonByteLength(value) {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

function cleanString(value, maxLength) {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();

  if (!trimmed) return null;
  if (trimmed.length > maxLength) return null;

  return trimmed;
}

function normalizeIdempotencyKey(request, payload) {
  return (
    cleanString(request.headers.get('Idempotency-Key'), 200) ||
    cleanString(payload?.submission?.idempotency_key, 200) ||
    crypto.randomUUID()
  );
}

async function verifyTurnstile(request, env, token) {
  if (!env.TURNSTILE_SECRET_KEY) {
    return true;
  }

  if (!token || typeof token !== 'string') {
    return false;
  }

  const formData = new FormData();
  formData.append('secret', env.TURNSTILE_SECRET_KEY);
  formData.append('response', token);

  const result = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      body: formData
    }
  );

  if (!result.ok) return false;

  const outcome = await result.json();
  return outcome.success === true;
}

function extractAllowedItemKeys(definition) {
  const keys = new Set();

  if (!definition || typeof definition !== 'object') {
    return keys;
  }

  const scan = (node) => {
    if (Array.isArray(node)) {
      for (const child of node) scan(child);
      return;
    }

    if (!isPlainObject(node)) return;

    if (typeof node.key === 'string' && node.key.trim()) {
      keys.add(node.key.trim());
    }

    if (typeof node.item_key === 'string' && node.item_key.trim()) {
      keys.add(node.item_key.trim());
    }

    for (const value of Object.values(node)) {
      if (Array.isArray(value) || isPlainObject(value)) {
        scan(value);
      }
    }
  };

  scan(definition);

  return keys;
}

function validatePayload(payload) {
  if (!isPlainObject(payload)) {
    return { ok: false, error: 'Invalid JSON payload' };
  }

  const instrumentKey = cleanString(payload.instrument?.key, 100);
  const instrumentVersion = cleanString(payload.instrument?.version, 100);

  if (!instrumentKey || !instrumentVersion) {
    return { ok: false, error: 'Missing instrument key/version' };
  }

  const items = Array.isArray(payload.items) ? payload.items : [];

  if (items.length === 0) {
    return { ok: false, error: 'Submission must include at least one item' };
  }

  if (items.length > MAX_ITEMS) {
    return { ok: false, error: 'Too many submitted items' };
  }

  const normalizedItems = [];
  const seenItemKeys = new Set();

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];

    if (!isPlainObject(item)) {
      return { ok: false, error: `Invalid item at index ${i}` };
    }

    const itemKey = cleanString(item.item_key, 200);
    const itemType = cleanString(item.item_type, 100);

    if (!itemKey) {
      return { ok: false, error: `Missing item_key at index ${i}` };
    }

    if (!itemType) {
      return { ok: false, error: `Missing item_type at index ${i}` };
    }

    if (seenItemKeys.has(itemKey)) {
      return { ok: false, error: `Duplicate item key: ${itemKey}` };
    }

    seenItemKeys.add(itemKey);

    if (jsonByteLength(item.response_value ?? null) > MAX_RESPONSE_JSON_BYTES) {
      return { ok: false, error: `Response too large for item ${itemKey}` };
    }

    normalizedItems.push({
      item_key: itemKey,
      item_index: Number.isInteger(item.item_index) ? item.item_index : i,
      item_type: itemType,
      response_value: item.response_value ?? null
    });
  }

  return {
    ok: true,
    instrumentKey,
    instrumentVersion,
    items: normalizedItems,
    turnstileToken:
      payload.turnstileToken ||
      payload.cf_turnstile_response ||
      null
  };
}

export async function onRequestOptions(context) {
  const { request, env } = context;

  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request, env)
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const contentType = request.headers.get('Content-Type') || '';

    if (!contentType.includes('application/json')) {
      return publicError(request, env, 'Content-Type must be application/json', 415);
    }

    const contentLength = Number(request.headers.get('Content-Length') || 0);

    if (contentLength && contentLength > MAX_BODY_BYTES) {
      return publicError(request, env, 'Payload too large', 413);
    }

    const rawBody = await request.text();

    if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
      return publicError(request, env, 'Payload too large', 413);
    }

    let payload;

    try {
      payload = JSON.parse(rawBody);
    } catch {
      return publicError(request, env, 'Invalid JSON', 400);
    }

    const validated = validatePayload(payload);

    if (!validated.ok) {
      return publicError(request, env, validated.error, 400);
    }

    const turnstileOk = await verifyTurnstile(
      request,
      env,
      validated.turnstileToken
    );

    if (!turnstileOk) {
      return publicError(request, env, 'Bot verification failed', 403);
    }

    const idempotencyKey = normalizeIdempotencyKey(request, payload);

    const supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    const { data: existingSubmission, error: existingError } = await supabase
      .from('submissions')
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (existingError) {
      console.error('Failed to check idempotency key', existingError);
      return publicError(request, env, 'Failed to process submission', 500);
    }

    if (existingSubmission) {
      return json(request, env, {
        ok: true,
        submission_id: existingSubmission.id,
        duplicate: true
      });
    }

    const { data: instrument, error: instrumentError } = await supabase
      .from('instruments')
      .select('id, key')
      .eq('key', validated.instrumentKey)
      .single();

    if (instrumentError || !instrument) {
      return publicError(request, env, 'Instrument not found', 404);
    }

    const { data: versionRow, error: versionError } = await supabase
      .from('instrument_versions')
      .select('id, version, definition, is_active')
      .eq('instrument_id', instrument.id)
      .eq('version', validated.instrumentVersion)
      .eq('is_active', true)
      .single();

    if (versionError || !versionRow) {
      return publicError(request, env, 'Instrument version not found', 404);
    }

    const allowedItemKeys = extractAllowedItemKeys(versionRow.definition);

    if (allowedItemKeys.size > 0) {
      for (const item of validated.items) {
        if (!allowedItemKeys.has(item.item_key)) {
          return publicError(
            request,
            env,
            `Invalid item key: ${item.item_key}`,
            400
          );
        }
      }
    }

    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .insert({
        instrument_version_id: versionRow.id,
        respondent_id: null,
        session_id: null,
        status: 'completed',
        submitted_at: new Date().toISOString(),
        idempotency_key: idempotencyKey,
        metadata: {
          source: 'public_form',
          submitted_from_origin: request.headers.get('Origin') || null
        }
      })
      .select('id')
      .single();

    if (submissionError || !submission) {
      console.error('Failed to create submission', submissionError);
      return publicError(request, env, 'Failed to create submission', 500);
    }

    const submissionId = submission.id;

    const itemRows = validated.items.map((item) => ({
      submission_id: submissionId,
      item_key: item.item_key,
      item_index: item.item_index,
      item_type: item.item_type,
      response_value: item.response_value
    }));

    const { error: itemsError } = await supabase
      .from('submission_items')
      .insert(itemRows);

    if (itemsError) {
      console.error('Failed to insert submission items', itemsError);

      await supabase
        .from('submissions')
        .delete()
        .eq('id', submissionId);

      return publicError(request, env, 'Failed to save submission', 500);
    }

    return json(request, env, {
      ok: true,
      submission_id: submissionId,
      item_count: itemRows.length
    });
  } catch (err) {
    console.error('Unexpected submit error', err);
    return publicError(request, env, 'Unexpected error', 500);
  }
}