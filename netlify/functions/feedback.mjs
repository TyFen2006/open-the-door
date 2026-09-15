// Grades a finished roleplay. Takes the transcript + the metrics the browser
// already measured (wpm, fillers, talk ratio) and asks a cheap text model for
// qualitative coaching + rubric scores. Returns strict JSON.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

const RUBRIC = [
  { k: 'approach', t: 'Approach & rapport' },
  { k: 'discovery', t: 'Needs discovery' },
  { k: 'presentation', t: 'Solution & value' },
  { k: 'objection', t: 'Objection handling' },
  { k: 'close', t: 'Close & next step' },
  { k: 'comm', t: 'Communication (pace, tone, fillers)' },
];

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const key = process.env.OPENAI_API_KEY;
  if (!key) return json({ error: 'Server is missing OPENAI_API_KEY.' }, 500);

  let body = {};
  try { body = await req.json(); } catch {}
  const { transcript = [], metrics = {}, script = '', persona = '', roundName = '' } = body;

  const model = process.env.FEEDBACK_MODEL || 'gpt-4o-mini';

  const convo = (Array.isArray(transcript) ? transcript : [])
    .map((t) => `${t.role === 'user' ? 'SELLER' : 'BUYER'}: ${t.text}`)
    .join('\n');

  const sys = `You are an elite sales coach judging a collegiate sales-competition roleplay.
The SELLER (the person you coach) was practicing against an AI BUYER named/role: ${persona || 'a buyer'}.
Round: ${roundName || 'a sales round'}.

You are given:
- The full transcript.
- Objective delivery metrics the app already measured: ${JSON.stringify(metrics)}.
- The seller's intended game plan / script (they were trying to follow this):
${script || '(none provided)'}

Grade honestly and specifically. Reference actual lines from the transcript. Be warm but do not inflate.
Communication scoring must reflect the measured metrics (wpm ~130-160 is ideal; fewer fillers is better; a seller who talked far more than the buyer under-discovered).

Return ONLY JSON in exactly this shape:
{
  "headline": "one punchy sentence on how it went",
  "scores": { "approach": 0-100, "discovery": 0-100, "presentation": 0-100, "objection": 0-100, "close": 0-100, "comm": 0-100 },
  "tone": "2-3 sentences on tone/warmth/presence, citing the transcript",
  "pace": "1-2 sentences on speaking pace using the wpm metric",
  "fillers": "1-2 sentences on filler words using the metric",
  "scriptAdherence": "did they hit their intended steps (intro, agenda, recap, discovery, empathy, pitch/objections, close)? which did they skip?",
  "strengths": ["2-4 concrete things they did well, each quoting or referencing a moment"],
  "improvements": ["3-5 concrete, prioritized fixes for next round, most important first"],
  "nextRoundTip": "one sentence: the single most important thing to change next time"
}`;

  const messages = [
    { role: 'system', content: sys },
    { role: 'user', content: convo || '(the transcript was empty — the seller barely spoke)' },
  ];

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.4,
        response_format: { type: 'json_object' },
      }),
    });
    const data = await r.json();
    if (!r.ok) return json({ error: 'Feedback model failed.', detail: data }, r.status);
    let parsed = {};
    try { parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}'); } catch {}
    return json({ feedback: parsed, rubric: RUBRIC });
  } catch (e) {
    return json({ error: 'Could not reach OpenAI.', detail: String(e) }, 502);
  }
};
