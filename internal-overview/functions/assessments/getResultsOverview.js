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

const Q_KEYS = ['vitality', 'emotion', 'mind', 'execution', 'alignment'];

function getQuotientKeyMap() {
  return {
    vitality: {
      resilience: 'R_vitality',
      preparedness: 'P_vitality'
    },
    emotion: {
      resilience: 'R_emotion',
      preparedness: 'P_emotion'
    },
    mind: {
      resilience: 'R_mind',
      preparedness: 'P_mind'
    },
    execution: {
      resilience: 'R_execution',
      preparedness: 'P_execution'
    },
    alignment: {
      resilience: 'R_alignment',
      preparedness: 'P_alignment'
    }
  };
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

function isNumber(value) {
  return typeof value === 'number' && !Number.isNaN(value);
}

function average(values) {
  const nums = values.filter(isNumber);

  if (!nums.length) return null;

  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function round(value, decimals = 2) {
  if (!isNumber(value)) return value;

  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function countBy(values) {
  return values.reduce((acc, value) => {
    if (value === null || value === undefined || value === '') return acc;

    const key = String(value);
    acc[key] = (acc[key] || 0) + 1;

    return acc;
  }, {});
}

function uniq(values) {
  return [...new Set(values.filter(Boolean).map(String))].sort();
}

function firstDefined(...values) {
  return values.find(
    value => value !== undefined && value !== null && value !== ''
  );
}

function getMeta(submission, key) {
  const meta = submission.metadata || {};

  if (key === 'batch_id') {
    return firstDefined(meta.batch_id, meta.batchId, meta.batch);
  }

  if (key === 'industry') {
    return firstDefined(meta.industry, meta.Industry, meta.company_industry);
  }

  if (key === 'size') {
    return firstDefined(
      meta.size,
      meta.company_size,
      meta.companySize,
      meta.organisation_size,
      meta.organization_size
    );
  }

  if (key === 'source') {
    return firstDefined(meta.source, meta.utm_source, meta.channel, meta.referrer);
  }

  return meta[key];
}

function toTimestamp(value) {
  if (!value) return null;

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? null : timestamp;
}

function submittedAtRange(submissions) {
  const timestamps = submissions
    .map(s => toTimestamp(s.submitted_at))
    .filter(ts => ts !== null)
    .sort((a, b) => a - b);

  if (!timestamps.length) {
    return {
      first_submitted_at: null,
      last_submitted_at: null
    };
  }

  return {
    first_submitted_at: new Date(timestamps[0]).toISOString(),
    last_submitted_at: new Date(timestamps[timestamps.length - 1]).toISOString()
  };
}

function buildScoreMapForSubmissions(submissions, scoreRows) {
  const scoresBySubmissionId = {};

  for (const row of scoreRows || []) {
    if (!scoresBySubmissionId[row.submission_id]) {
      scoresBySubmissionId[row.submission_id] = {};
    }

    scoresBySubmissionId[row.submission_id][row.score_key] = getScoreValue(row);
  }

  return submissions.map(submission => ({
    id: submission.id,
    submitted_at: submission.submitted_at,
    metadata: submission.metadata || {},
    scores: scoresBySubmissionId[submission.id] || {}
  }));
}

function averageScore(submissions, scoreKey) {
  return round(
    average(
      submissions
        .map(submission => submission.scores?.[scoreKey])
        .filter(isNumber)
    )
  );
}

function buildQuotientAverages(submissions) {
  const keyMap = getQuotientKeyMap();
  const quotients = {};

  for (const q of Q_KEYS) {
    const keys = keyMap[q];

    const values = submissions
      .map(submission => {
        const r = submission.scores?.[keys.resilience];
        const p = submission.scores?.[keys.preparedness];

        if (isNumber(r) && isNumber(p)) return (r + p) / 2;
        if (isNumber(r)) return r;
        if (isNumber(p)) return p;

        return null;
      })
      .filter(isNumber);

    quotients[q] = round(average(values));
  }

  return quotients;
}

function scoreBand(value, low = 2.75, high = 3.35) {
  if (!isNumber(value)) return null;
  if (value < low) return 'low';
  if (value < high) return 'mid';
  return 'high';
}

function buildQuotientProfiles(submissions) {
  const keyMap = getQuotientKeyMap();
  const profiles = {};

  for (const q of Q_KEYS) {
    const keys = keyMap[q];

    const resilienceAverage = averageScore(submissions, keys.resilience);
    const preparednessAverage = averageScore(submissions, keys.preparedness);

    let overall = null;

    if (isNumber(resilienceAverage) && isNumber(preparednessAverage)) {
      overall = round((resilienceAverage + preparednessAverage) / 2);
    } else if (isNumber(resilienceAverage)) {
      overall = resilienceAverage;
    } else if (isNumber(preparednessAverage)) {
      overall = preparednessAverage;
    }

    profiles[q] = {
      average: overall,
      resilience_average: resilienceAverage,
      preparedness_average: preparednessAverage,
      bands: {
        low: quotientValues.filter(v => scoreBand(v) === 'low').length,
        mid: quotientValues.filter(v => scoreBand(v) === 'mid').length,
        high: quotientValues.filter(v => scoreBand(v) === 'high').length
      }
    };
  }

  return profiles;
}

function buildModeAverages(submissions) {
  const resilience = averageScore(submissions, 'resilience_score');
  const preparedness = averageScore(submissions, 'preparedness_score');
  const overall = averageScore(submissions, 'overall_score');

  return {
    resilience,
    preparedness,
    overall
  };
}

function getOperatingPattern(averages) {
  const { resilience, preparedness } = averages;

  if (!isNumber(resilience) || !isNumber(preparedness)) {
    return 'Unclassified';
  }

  const delta = round(resilience - preparedness);

  if (delta > 0.25) return 'Resilience-heavy';
  if (delta < -0.25) return 'Preparedness-heavy';

  return 'Balanced';
}

function buildOverviewRow(batchId, submissions) {
  const ranges = submittedAtRange(submissions);
  const averages = buildModeAverages(submissions);
  const quotientProfiles = buildQuotientProfiles(submissions);

  return {
    batch_id: batchId,
    submission_count: submissions.length,

    first_submitted_at: ranges.first_submitted_at,
    last_submitted_at: ranges.last_submitted_at,

    industries: countBy(submissions.map(s => getMeta(s, 'industry'))),
    sizes: countBy(submissions.map(s => getMeta(s, 'size'))),
    sources: countBy(submissions.map(s => getMeta(s, 'source'))),

    averages,

    quotients: buildQuotientAverages(submissions),

    quotient_profiles: quotientProfiles,

    operating_pattern: getOperatingPattern(averages)
  };
}

function buildFilters(rows) {
  return {
    batch_ids: uniq(rows.map(row => row.batch_id)),
    industries: uniq(rows.flatMap(row => Object.keys(row.industries || {}))),
    sizes: uniq(rows.flatMap(row => Object.keys(row.sizes || {}))),
    sources: uniq(rows.flatMap(row => Object.keys(row.sources || {}))),
    operating_patterns: uniq(rows.map(row => row.operating_pattern))
  };
}

function matchesRequestedFilters(submission, params) {
  const batchId = params.get('batch_id');
  const industry = params.get('industry');
  const size = params.get('size');
  const source = params.get('source');
  const submittedAfter = params.get('submitted_after');
  const submittedBefore = params.get('submitted_before');

  if (!getMeta(submission, 'batch_id')) return false;

  if (batchId && getMeta(submission, 'batch_id') !== batchId) return false;
  if (industry && getMeta(submission, 'industry') !== industry) return false;
  if (size && getMeta(submission, 'size') !== size) return false;
  if (source && getMeta(submission, 'source') !== source) return false;

  const submittedAt = toTimestamp(submission.submitted_at);

  if (submittedAfter) {
    const afterTs = toTimestamp(submittedAfter);

    if (afterTs !== null && submittedAt !== null && submittedAt < afterTs) {
      return false;
    }
  }

  if (submittedBefore) {
    const beforeTs = toTimestamp(submittedBefore);

    if (beforeTs !== null && submittedAt !== null && submittedAt > beforeTs) {
      return false;
    }
  }

  return true;
}

function groupByBatch(shapedSubmissions) {
  const grouped = {};

  for (const submission of shapedSubmissions) {
    const batchId = getMeta(submission, 'batch_id');

    if (!batchId) continue;

    if (!grouped[batchId]) grouped[batchId] = [];

    grouped[batchId].push(submission);
  }

  return grouped;
}

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);

    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      return json(
        {
          error: 'Missing Supabase environment variables',
          hasSupabaseUrl: !!env.SUPABASE_URL,
          hasServiceRoleKey: !!env.SUPABASE_SERVICE_ROLE_KEY
        },
        500
      );
    }

    const supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    );

    /*
      This mirrors your current getBatchResults approach:
      fetch submissions with metadata, then filter/group in JS.

      Later, once batch_id/industry/size/source become real columns,
      move these filters into the Supabase query for better performance.
    */
    const { data: allSubmissions, error: submissionsError } = await supabase
      .from('submissions')
      .select('id, metadata, submitted_at')
      .not('metadata', 'is', null);

    if (submissionsError) {
      return json(
        {
          error: 'Failed to fetch submissions',
          details: submissionsError.message || submissionsError
        },
        500
      );
    }

    const filteredSubmissions = (allSubmissions || []).filter(submission =>
      matchesRequestedFilters(submission, url.searchParams)
    );

    if (!filteredSubmissions.length) {
      return json({
        ok: true,
        rows: [],
        filters: {
          batch_ids: [],
          industries: [],
          sizes: [],
          sources: [],
          operating_patterns: []
        },
        meta: {
          submission_count: 0,
          batch_count: 0
        }
      });
    }

    const submissionIds = filteredSubmissions.map(s => s.id);

    const { data: scoreRows, error: scoresError } = await supabase
      .from('submission_scores')
      .select('submission_id, score_key, numeric_value, text_value, json_value')
      .in('submission_id', submissionIds);

    if (scoresError) {
      return json(
        {
          error: 'Failed to fetch submission_scores',
          details: scoresError.message || scoresError
        },
        500
      );
    }

    const shapedSubmissions = buildScoreMapForSubmissions(
      filteredSubmissions,
      scoreRows || []
    );

    const grouped = groupByBatch(shapedSubmissions);

    let rows = Object.entries(grouped)
      .map(([batchId, submissions]) => buildOverviewRow(batchId, submissions))
      .sort((a, b) => {
        const aTs = toTimestamp(a.last_submitted_at) || 0;
        const bTs = toTimestamp(b.last_submitted_at) || 0;

        return bTs - aTs;
      });

    const limit = Number(url.searchParams.get('limit') || 0);

    if (Number.isFinite(limit) && limit > 0) {
      rows = rows.slice(0, limit);
    }

    return json({
      ok: true,
      rows,
      filters: buildFilters(rows),
      meta: {
        submission_count: shapedSubmissions.length,
        batch_count: rows.length
      }
    });
  } catch (err) {
    return json(
      {
        error: 'Unexpected server error',
        details: err?.message || String(err)
      },
      500
    );
  }
}