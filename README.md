# Open the Door — Sales Confidence Trainer + Comp Mode

A single-page trainer for sales competitions. Everything except **Comp Mode** runs
100% on your device with no setup (delivery drills, scorecard, mindset, etc.).

**Comp Mode** is the new part: you upload your competition packet, set up your
rounds (cold call → CISO → CIO, or whatever your comp uses), load your script,
and then **talk out loud to an AI that plays the buyer** — objections and all.
When you hang up it grades you on tone, pace, filler words, and the rubric.

Comp Mode needs a live AI, so it needs a one-time setup: an OpenAI key and a free
Netlify deploy. Budget ~15 minutes. Here's every step.

---

## What you're setting up (plain English)

- The AI buyer is OpenAI's **Realtime voice** model — real voice-to-voice, you can
  interrupt it, it reacts instantly.
- Your OpenAI key is **secret**. It lives on Netlify (the host), never in the app.
  The browser only ever gets a 60-second throwaway token.
- Two tiny functions do this: `session` (mints the token) and `feedback` (grades
  the transcript afterward). They're in `netlify/functions/`.

## Cost (read this — it's small but not zero)

- Comp Mode uses OpenAI, which charges per minute of audio. It defaults to the most
  **Natural** voice (`gpt-realtime`, ~$0.06–0.11/min ≈ **$0.60–1.10 per 10-min round**).
  In the app, **Settings → Buyer voice quality → Economy** switches to `gpt-realtime-mini`
  (~$0.02–0.05/min ≈ 20–50¢) — cheaper but flatter/more robotic.
- **You set a hard spending cap** (Step 1.4 below) so it can *never* surprise you.
- Everything else in the app is free and needs none of this.

---

## Step 1 — Get an OpenAI API key

1. Go to **https://platform.openai.com/signup** and create an account (this is the
   *developer platform*, separate from ChatGPT).
2. Add a payment method: **https://platform.openai.com/settings/organization/billing**
   → add a card and put **$5–$10** of credit on it. That's plenty to practice a lot.
3. **Set a hard limit** so you're safe: same billing page → **Usage limits** →
   set a monthly cap (e.g. **$10**). OpenAI stops when you hit it.
4. Create the key: **https://platform.openai.com/api-keys** → **Create new secret
   key** → copy it (starts with `sk-...`). **Copy it now** — you can't see it again.
   Keep it private; never paste it into the app or share it.

## Step 2 — Put the app on Netlify (free)

1. Go to **https://app.netlify.com/signup** and make a free account.
2. Easiest deploy — drag and drop:
   - In Netlify, click **Add new site → Deploy manually**.
   - Drag this whole **`Sales-Confidence-App`** folder onto the drop zone.
   - Netlify gives you a URL like `https://your-site-name.netlify.app`.
   - (The included `netlify.toml` automatically wires up the two functions — no config.)
3. *(Alternative: connect a GitHub repo instead of drag-and-drop if you prefer.)*

## Step 3 — Add your secret key to Netlify

1. In your Netlify site: **Site configuration → Environment variables → Add a variable**.
2. Add:
   - Key: **`OPENAI_API_KEY`**  → Value: the `sk-...` key from Step 1.4
3. **Redeploy** so it takes effect: **Deploys → Trigger deploy → Deploy site**.
   (Env vars only apply to deploys made *after* you add them.)

Optional variables (only if you want to change models later):
- `REALTIME_MODEL` — force one voice model regardless of the in-app toggle. Leave unset
  to let the app choose (`gpt-realtime` for Natural, `gpt-realtime-mini` for Economy).
  Set it only to pin a specific id if OpenAI renames these.
- `FEEDBACK_MODEL` — the grader (default `gpt-4o-mini`).

## Step 4 — Turn it on

1. Open your `https://your-site-name.netlify.app` — **on your iPhone** is ideal
   (add it to your Home Screen: Share → *Add to Home Screen* — it runs full-screen
   like an app).
2. Go to **Comp Mode** (bottom nav) → open **Settings** (gear, top right) →
   **AI backend** card → **Test connection**.
   - You want: **✓ Connected — Comp Mode is ready to go.**
   - Since the app and functions are on the same Netlify site, **leave the URL box
     blank.**
3. Grant the **microphone** permission when your first call asks for it.

That's it. Make a competition, upload your packet, hit **Start call**, and talk.

---

## Using Comp Mode

- **New competition** → give it a name. It starts with a sensible 3-round template
  (Cold Call, CISO, CIO) and your script pre-filled — edit anything.
- **Packet**: upload a PDF or `.txt`, or paste the text. This is everything the AI
  buyer "knows" — company, your role, the product, the pitch, the case.
- **Script / game plan**: your intended flow. The AI won't read it aloud; it just
  knows where you're trying to steer, so it can react like a real buyer as you work
  the steps.
- **Each round**: pick who the AI plays (name, title, personality notes), a voice,
  the **objection difficulty (1–5)**, a time limit, and an optional per-round script.
- **On the call**: live timer with time-check nudges, a live transcript, mute, and
  **End & score**.
- **After**: your real wpm, filler count, talk-ratio and length, plus AI coaching on
  tone/pace/fillers, a rubric breakdown, what worked, and a prioritized fix list.

### Tips
- Start a round at difficulty **3**, then crank to **4–5** once you're handling it.
- The more real your packet, the sharper the buyer. Paste the actual comp sheet.
- Redo a round right after feedback ("Run it again") to lock in the fix.

---

## Run it locally instead (optional, for tinkering)

Comp Mode's functions need Netlify's local runtime:

```bash
npm install -g netlify-cli
cd Sales-Confidence-App
netlify env:set OPENAI_API_KEY sk-your-key   # or set it in the dashboard
netlify dev
```

Then open the URL it prints (usually `http://localhost:8888`). The static drills
also work by just opening `index.html` directly — only Comp Mode needs the backend.

## Privacy
- Your packet, scripts, and past feedback are stored **only in your browser**
  (localStorage on that device).
- During a call your audio streams directly to OpenAI to power the buyer; this app
  doesn't record or store your audio. The **transcript** is kept on your device so
  it can be graded and shown back to you.

## Troubleshooting
- **"Server is missing OPENAI_API_KEY"** → you didn't add the env var, or didn't
  redeploy after adding it (Step 3).
- **"OpenAI would not start a session" / "refused the connection"** → key has no
  credit, hit its cap, or OpenAI renamed the model — set `REALTIME_MODEL` to a current
  realtime model id (e.g. `gpt-realtime-mini` or `gpt-realtime`) and redeploy.
- **Test connection fails from a non-Netlify address** → paste your full
  `https://your-site.netlify.app` into Settings → AI backend → Save.
- **No mic / no voice** → use Safari (iPhone) or Chrome, and allow the mic. iOS needs
  a tap before audio plays — the Start call button counts.
