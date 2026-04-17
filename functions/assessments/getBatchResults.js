import { createClient } from '@supabase/supabase-js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

function getScoreValue(row) {
  if (row.numeric_value !== null && row.numeric_value !== undefined) {
    return row.numeric_value;
  }
  if (row.text_value !== null && row.text_value !== undefined) {
    return row.text_value;
  }
  if (row.json_value !== null && row.json_value !== undefined) {
    return row.json_value;
  }
  return null;
}

function average(values) {
  const nums = values.filter(v => typeof v === 'number' && !Number.isNaN(v));
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function round(value, decimals = 2) {
  if (typeof value !== 'number' || Number.isNaN(value)) return value;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function countBy(values) {
  return values.reduce((acc, value) => {
    const key = value ?? 'null';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function stdDev(values) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  
  const variance = values.reduce((sum, v) => {
    return sum + Math.pow(v - mean, 2);
  }, 0) / values.length;

  return Math.sqrt(variance);
}

function buildSessionSummary(batchId, submissions) {
  const allScoreKeys = new Set();
  for (const submission of submissions) {
    for (const key of Object.keys(submission.scores || {})) {
      allScoreKeys.add(key);
    }
  }

  const averages = {};
  const distributions = {};
  const standardDevs = {};

  for (const key of allScoreKeys) {
    const values = submissions.map(s => s.scores[key]).filter(v => v !== null && v !== undefined);

    const numericValues = values.filter(v => typeof v === 'number' && !Number.isNaN(v));
    if (numericValues.length) {
      averages[key] = round(average(numericValues));
      standardDevs[key] = stdDev(numericValues);
      continue;
    }

    const textValues = values.filter(v => typeof v === 'string' && v.trim() !== '');
    if (textValues.length) {
      distributions[key] = countBy(textValues);
    }
  }

  return {
    batch_id: batchId,
    submission_count: submissions.length,
    averages,
    distributions,
    industries: countBy(submissions.map(s => s.metadata?.industry).filter(Boolean)),
    sources: countBy(submissions.map(s => s.metadata?.source).filter(Boolean))
  };
}

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const batchId = url.searchParams.get('batch_id');

    if (!batchId) {
      return json({ error: 'Missing batch_id' }, 400);
    }

    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      return json({
        error: 'Missing Supabase environment variables',
        hasSupabaseUrl: !!env.SUPABASE_URL,
        hasServiceRoleKey: !!env.SUPABASE_SERVICE_ROLE_KEY
      }, 500);
    }

    const supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Fetch broadly first, then filter in JS to avoid JSON-path query issues
    const { data: allSubmissions, error: submissionsError } = await supabase
      .from('submissions')
      .select('id, metadata, submitted_at')
      .not('metadata', 'is', null);

    if (submissionsError) {
      return json({
        error: 'Failed to fetch submissions',
        details: submissionsError.message || submissionsError
      }, 500);
    }

    const submissions = (allSubmissions || []).filter(
      s => s.metadata && s.metadata.batch_id === batchId
    );

    if (!submissions.length) {
      return json({
        ok: true,
        batch_id: batchId,
        session: buildSessionSummary(batchId, []),
        submissions: []
      });
    }

    const submissionIds = submissions.map(s => s.id);

    const { data: scoreRows, error: scoresError } = await supabase
      .from('submission_scores')
      .select('submission_id, score_key, numeric_value, text_value, json_value')
      .in('submission_id', submissionIds);

    if (scoresError) {
      return json({
        error: 'Failed to fetch submission_scores',
        details: scoresError.message || scoresError
      }, 500);
    }

    const scoresBySubmissionId = {};

    for (const row of scoreRows || []) {
      if (!scoresBySubmissionId[row.submission_id]) {
        scoresBySubmissionId[row.submission_id] = {};
      }
      scoresBySubmissionId[row.submission_id][row.score_key] = getScoreValue(row);
    }

    const shapedSubmissions = submissions.map(submission => ({
      id: submission.id,
      submitted_at: submission.submitted_at,
      metadata: submission.metadata || {},
      scores: scoresBySubmissionId[submission.id] || {}
    }));

    return json({
      ok: true,
      batch_id: batchId,
      session: buildSessionSummary(batchId, shapedSubmissions),
      submissions: shapedSubmissions
    });
  } catch (err) {
    return json({
      error: 'Unexpected server error',
      details: err?.message || String(err)
    }, 500);
  }
}