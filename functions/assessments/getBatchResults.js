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

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}

function stdDev(values, useSample = false) {
  const avg = average(values);

  const variance = values.reduce((sum, v) => {
    return sum + Math.pow(v - avg, 2);
  }, 0) / (useSample ? (values.length - 1) : values.length);

  return Math.sqrt(variance);
}

function isNumber(value) {
  return typeof value === 'number' && !Number.isNaN(value);
}

function safeAverage(values) {
  const nums = values.filter(isNumber);
  if (!nums.length) return null;
  return average(nums);
}

function safeStdDev(values, useSample = false) {
  const nums = values.filter(isNumber);
  if (nums.length < 2) return 0;
  return stdDev(nums, useSample);
}

function minValue(values) {
  const nums = values.filter(isNumber);
  return nums.length ? Math.min(...nums) : null;
}

function maxValue(values) {
  const nums = values.filter(isNumber);
  return nums.length ? Math.max(...nums) : null;
}

function scoreBand(value, low = 2.75, high = 3.35) {
  if (!isNumber(value)) return null;
  if (value < low) return 'low';
  if (value < high) return 'mid';
  return 'high';
}

function buildNumericProfiles(submissions, allScoreKeys) {
  const numeric_profiles = {};

  for (const key of allScoreKeys) {
    const values = submissions
      .map(s => s.scores[key])
      .filter(isNumber);

    if (!values.length) continue;

    numeric_profiles[key] = {
      count: values.length,
      average: round(average(values)),
      median: round(median(values)),
      std_dev: round(stdDev(values)),
      min: round(minValue(values)),
      max: round(maxValue(values)),
      bands: {
        low: values.filter(v => scoreBand(v) === 'low').length,
        mid: values.filter(v => scoreBand(v) === 'mid').length,
        high: values.filter(v => scoreBand(v) === 'high').length
      }
    };
  }

  return numeric_profiles;
}

function buildQuotientInsights(numericProfiles) {
  const keyMap = getQuotientKeyMap();
  const quotients = {};

  for (const q of Q_KEYS) {
    const keys = keyMap[q];
    const resilience = numericProfiles[keys.resilience];
    const preparedness = numericProfiles[keys.preparedness];

    if (!resilience && !preparedness) continue;

    const avgR = resilience?.average ?? null;
    const avgP = preparedness?.average ?? null;
    const avgOverall =
      isNumber(avgR) && isNumber(avgP)
        ? round((avgR + avgP) / 2)
        : isNumber(avgR)
        ? avgR
        : isNumber(avgP)
        ? avgP
        : null;

    const gap = isNumber(avgR) && isNumber(avgP) ? round(avgR - avgP) : null;
    const absGap = isNumber(gap) ? round(Math.abs(gap)) : null;

    const spread =
      resilience?.std_dev != null && preparedness?.std_dev != null
        ? round((resilience.std_dev + preparedness.std_dev) / 2)
        : resilience?.std_dev ?? preparedness?.std_dev ?? 0;

    let consistency = 'unknown';
    if (spread <= 0.2) consistency = 'high';
    else if (spread <= 0.45) consistency = 'medium';
    else consistency = 'low';

    let pattern = 'balanced';
    if (isNumber(gap)) {
      if (gap > 0.25) pattern = 'resilience-heavy';
      else if (gap < -0.25) pattern = 'preparedness-heavy';
    }

    quotients[q] = {
      key: q,
      average: avgOverall,
      resilience_average: avgR,
      preparedness_average: avgP,
      std_dev: spread,
      consistency,
      gap,
      abs_gap: absGap,
      pattern,
      min: null,
      max: null,
      bands: { low: 0, mid: 0, high: 0 }
    };
  }

  return quotients;
}

function buildModeInsights(numericProfiles) {
  const resilience = numericProfiles['resilience_score'];
  const preparedness = numericProfiles['preparedness_score'];
  const overall = numericProfiles['overall_score'];

  const meanR = resilience?.average ?? null;
  const meanP = preparedness?.average ?? null;
  const delta = isNumber(meanR) && isNumber(meanP) ? round(meanR - meanP) : null;
  const absDelta = isNumber(delta) ? Math.abs(delta) : null;

  let pattern = 'balanced';
  if (isNumber(delta)) {
    if (delta > 0.25) pattern = 'resilience-heavy';
    else if (delta < -0.25) pattern = 'preparedness-heavy';
  }

  return {
    resilience: resilience || null,
    preparedness: preparedness || null,
    overall: overall || null,
    delta,
    abs_delta: absDelta,
    pattern,
    weaker_mode: pattern === 'resilience-heavy'
      ? 'preparedness'
      : pattern === 'preparedness-heavy'
      ? 'resilience'
      : null
  };
}

function buildExecutiveSignals(quotientInsights, modeInsights) {
  const quotients = Object.values(quotientInsights).filter(q => isNumber(q.average));
  const byAvgDesc = [...quotients].sort((a, b) => b.average - a.average);
  const byAvgAsc = [...quotients].sort((a, b) => a.average - b.average);
  const byGapDesc = [...quotients].sort((a, b) => (b.abs_gap ?? 0) - (a.abs_gap ?? 0));
  const bySpreadDesc = [...quotients].sort((a, b) => (b.std_dev ?? 0) - (a.std_dev ?? 0));

  const strongest = byAvgDesc[0] || null;
  const weakest = byAvgAsc[0] || null;
  const biggestGap = byGapDesc[0] || null;
  const mostFragmented = bySpreadDesc[0] || null;

  const signals = [];

  if (strongest) {
    signals.push({
      type: 'strength',
      title: 'Consistent strength',
      key: strongest.key,
      message: `${strongest.key} is the strongest shared dimension in this cohort.`
    });
  }

  if (weakest) {
    signals.push({
      type: 'constraint',
      title: 'Primary constraint',
      key: weakest.key,
      message: `${weakest.key} is the weakest shared dimension and likely the first place the system breaks under strain.`
    });
  }

  if (modeInsights?.pattern === 'resilience-heavy') {
    signals.push({
      type: 'pattern',
      title: 'Structural pattern',
      message: 'Resilience currently exceeds Preparedness, suggesting the group relies more on coping under pressure than on system design.'
    });
  } else if (modeInsights?.pattern === 'preparedness-heavy') {
    signals.push({
      type: 'pattern',
      title: 'Structural pattern',
      message: 'Preparedness currently exceeds Resilience, suggesting structure exists on paper more than it holds under live pressure.'
    });
  } else {
    signals.push({
      type: 'pattern',
      title: 'Structural pattern',
      message: 'Resilience and Preparedness are relatively balanced across the cohort.'
    });
  }

  if (biggestGap && isNumber(biggestGap.abs_gap) && biggestGap.abs_gap > 0.25) {
    signals.push({
      type: 'leverage',
      title: 'Highest leverage',
      key: biggestGap.key,
      message: `${biggestGap.key} shows the largest Resilience/Preparedness imbalance, making it the clearest leverage point for improvement.`
    });
  }

  if (mostFragmented && isNumber(mostFragmented.std_dev) && mostFragmented.std_dev > 0.45) {
    signals.push({
      type: 'fragmentation',
      title: 'Fragmentation risk',
      key: mostFragmented.key,
      message: `${mostFragmented.key} varies widely across respondents, suggesting an uneven experience of the system.`
    });
  }

  return {
    strongest,
    weakest,
    biggestGap,
    mostFragmented,
    items: signals
  };
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
  const std_devs = {};
  const medians = {};

  for (const key of allScoreKeys) {
    const values = submissions.map(s => s.scores[key]).filter(v => v !== null && v !== undefined);

    const numericValues = values.filter(isNumber);
    if (numericValues.length) {
      averages[key] = round(average(numericValues));
      medians[key] = round(median(numericValues));
      std_devs[key] = round(stdDev(numericValues));
      continue;
    }

    const textValues = values.filter(v => typeof v === 'string' && v.trim() !== '');
    if (textValues.length) {
      distributions[key] = countBy(textValues);
    }
  }

  const numeric_profiles = buildNumericProfiles(submissions, allScoreKeys);
  const quotient_insights = buildQuotientInsights(numeric_profiles);
  const mode_insights = buildModeInsights(numeric_profiles);
  const executive_signals = buildExecutiveSignals(quotient_insights, mode_insights);

  return {
    batch_id: batchId,
    submission_count: submissions.length,
    averages,
    distributions,
    std_devs,
    medians,
    numeric_profiles,
    quotient_insights,
    mode_insights,
    executive_signals,
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