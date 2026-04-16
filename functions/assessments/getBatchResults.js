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
  return nums.reduce((sum, v) => sum + v, 0) / nums.length;
}

function median(values) {
  const nums = values
    .filter(v => typeof v === 'number' && !Number.isNaN(v))
    .sort((a, b) => a - b);

  if (!nums.length) return null;

  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 === 0
    ? (nums[mid - 1] + nums[mid]) / 2
    : nums[mid];
}

function stdDev(values) {
  const nums = values.filter(v => typeof v === 'number' && !Number.isNaN(v));
  if (nums.length < 2) return 0;

  const mean = average(nums);
  const variance =
    nums.reduce((sum, v) => sum + (v - mean) ** 2, 0) / nums.length;

  return Math.sqrt(variance);
}

function countBy(values) {
  return values.reduce((acc, value) => {
    const key = value ?? 'null';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function round(value, decimals = 2) {
  if (typeof value !== 'number' || Number.isNaN(value)) return value;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function inferNumericKeyMap(submissions) {
  const keyMap = {};

  for (const submission of submissions) {
    for (const [key, value] of Object.entries(submission.scores || {})) {
      if (!(key in keyMap)) {
        keyMap[key] = typeof value;
      }
    }
  }

  return keyMap;
}

function buildSessionSummary(batchId, submissions) {
  const count = submissions.length;

  if (!count) {
    return {
      batch_id: batchId,
      submission_count: 0,
      averages: {},
      medians: {},
      std_devs: {},
      distributions: {},
      strongest_numeric_score: null,
      weakest_numeric_score: null
    };
  }

  const scoreTypeMap = inferNumericKeyMap(submissions);

  const numericKeys = Object.entries(scoreTypeMap)
    .filter(([, type]) => type === 'number')
    .map(([key]) => key);

  const textKeys = Object.entries(scoreTypeMap)
    .filter(([, type]) => type === 'string')
    .map(([key]) => key);

  const averages = {};
  const medians = {};
  const stdDevs = {};
  const distributions = {};

  for (const key of numericKeys) {
    const values = submissions.map(s => s.scores[key]);
    averages[key] = round(average(values));
    medians[key] = round(median(values));
    stdDevs[key] = round(stdDev(values));
  }

  for (const key of textKeys) {
    const values = submissions
      .map(s => s.scores[key])
      .filter(v => typeof v === 'string' && v.trim() !== '');
    distributions[key] = countBy(values);
  }

  const numericAverageEntries = Object.entries(averages)
    .filter(([, value]) => typeof value === 'number');

  numericAverageEntries.sort((a, b) => b[1] - a[1]);

  const strongestNumericScore = numericAverageEntries.length
    ? { score_key: numericAverageEntries[0][0], average: numericAverageEntries[0][1] }
    : null;

  const weakestNumericScore = numericAverageEntries.length
    ? {
        score_key: numericAverageEntries[numericAverageEntries.length - 1][0],
        average: numericAverageEntries[numericAverageEntries.length - 1][1]
      }
    : null;

  const industries = countBy(
    submissions.map(s => s.metadata?.industry).filter(Boolean)
  );

  const sources = countBy(
    submissions.map(s => s.metadata?.source).filter(Boolean)
  );

  return {
    batch_id: batchId,
    submission_count: count,
    industries,
    sources,
    averages,
    medians,
    std_devs: stdDevs,
    distributions,
    strongest_numeric_score: strongestNumericScore,
    weakest_numeric_score: weakestNumericScore
  };
}

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);

    const batchId = url.searchParams.get('batch_id');
    const includeSubmissions = url.searchParams.get('include_submissions') !== 'false';

    if (!batchId) {
      return json({ error: 'Missing batch_id' }, 400);
    }

    const supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: submissions, error: submissionsError } = await supabase
      .from('submissions')
      .select('id, respondent_id, session_id, status, metadata, created_at')
      .filter('metadata->>batch_id', 'eq', batchId);

    if (submissionsError) {
      return json(
        { error: 'Failed to fetch submissions', details: submissionsError },
        500
      );
    }

    if (!submissions || submissions.length === 0) {
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
      .select(
        'submission_id, score_key, score_type, numeric_value, text_value, json_value'
      )
      .in('submission_id', submissionIds);

    if (scoresError) {
      return json(
        { error: 'Failed to fetch submission scores', details: scoresError },
        500
      );
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
      respondent_id: submission.respondent_id,
      session_id: submission.session_id,
      status: submission.status,
      created_at: submission.created_at,
      metadata: submission.metadata || {},
      scores: scoresBySubmissionId[submission.id] || {}
    }));

    const session = buildSessionSummary(batchId, shapedSubmissions);

    return json({
      ok: true,
      batch_id: batchId,
      session,
      submissions: includeSubmissions ? shapedSubmissions : undefined
    });
  } catch (err) {
    return json({ error: err.message || 'Unexpected error' }, 500);
  }
}