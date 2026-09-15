// Mints a short-lived OpenAI Realtime token so the real API key never
// reaches the browser. The client uses the returned client_secret for ~60s
// to open a WebRTC connection straight to OpenAI, then it expires.

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

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const key = process.env.OPENAI_API_KEY;
  if (!key) return json({ error: 'Server is missing OPENAI_API_KEY. Add it in Netlify → Site settings → Environment variables.' }, 500);

  let body = {};
  try { body = await req.json(); } catch { /* empty body is fine */ }

  // Model can be overridden with an env var as OpenAI renames realtime models.
  const model = process.env.REALTIME_MODEL || 'gpt-realtime-mini';
  const voice = typeof body.voice === 'string' ? body.voice : 'verse';

  try {
    // GA endpoint: mint an ephemeral client secret bound to this session.
    const r = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model,
          audio: { output: { voice } },
        },
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      return json({ error: 'OpenAI would not start a session.', detail: data }, r.status);
    }
    // Ephemeral key is in `value` (older shape nested it under client_secret).
    const value = data.value || (data.client_secret && data.client_secret.value);
    if (!value) {
      return json({ error: 'OpenAI did not return an ephemeral token.', detail: data }, 502);
    }
    return json({ value, model });
  } catch (e) {
    return json({ error: 'Could not reach OpenAI.', detail: String(e) }, 502);
  }
};
