import { createClient } from '@supabase/supabase-js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const payload = await request.json();

    const supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    );

    const instrumentKey = payload.instrument?.key;
    const instrumentVersion = payload.instrument?.version;

    if (!instrumentKey || !instrumentVersion) {
      return json({ error: 'Missing instrument key/version' }, 400);
    }

    const { data: instrument, error: instrumentError } = await supabase
      .from('instruments')
      .select('id')
      .eq('key', instrumentKey)
      .single();

    if (instrumentError || !instrument) {
      return json({ error: 'Instrument not found', details: instrumentError }, 404);
    }

    const { data: versionRow, error: versionError } = await supabase
      .from('instrument_versions')
      .select('id')
      .eq('instrument_id', instrument.id)
      .eq('version', instrumentVersion)
      .single();

    if (versionError || !versionRow) {
      return json({ error: 'Instrument version not found', details: versionError }, 404);
    }

    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .insert({
        instrument_version_id: versionRow.id,
        respondent_id: payload.submission?.respondent_id ?? null,
        session_id: payload.submission?.session_id ?? null,
        status: payload.submission?.status ?? 'completed',
        metadata: payload.submission?.metadata ?? null
      })
      .select('id')
      .single();

    if (submissionError || !submission) {
      return json({ error: 'Failed to create submission', details: submissionError }, 500);
    }

    const submissionId = submission.id;

    const items = (payload.items || []).map(item => ({
      submission_id: submissionId,
      item_key: item.item_key,
      item_index: item.item_index,
      item_type: item.item_type,
      response_value: item.response_value
    }));

    if (items.length) {
      const { error: itemsError } = await supabase
        .from('submission_items')
        .insert(items);

      if (itemsError) {
        return json({ error: 'Failed to insert submission items', details: itemsError }, 500);
      }
    }

    const scores = (payload.scores || []).map(score => ({
      submission_id: submissionId,
      score_key: score.score_key,
      score_type: score.score_type,
      numeric_value: score.numeric_value ?? null,
      text_value: score.text_value ?? null,
      json_value: score.json_value ?? null
    }));

    if (scores.length) {
      const { error: scoresError } = await supabase
        .from('submission_scores')
        .insert(scores);

      if (scoresError) {
        return json({ error: 'Failed to insert submission scores', details: scoresError }, 500);
      }
    }

    return json({
      ok: true,
      submission_id: submissionId,
      item_count: items.length,
      score_count: scores.length
    });
  } catch (err) {
    return json({ error: err.message || 'Unexpected error' }, 500);
  }
}