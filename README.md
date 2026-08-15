# 🐕 Fetch — Your AI Dog Companion

Scan your pup, then chat, plan, and play — all connected. Built for the **DEV Weekend Challenge: Dog Days Edition**.

**Prize categories:** Best use of **Google AI** (Gemini) + Best use of **ElevenLabs**.

## Features

1. **📸 Breed Scanner** — upload a dog photo; Gemini vision identifies the breed, confidence, temperament, size/energy, care tips, and a fun fact.
2. **💬 Ask Fetch (breed-aware)** — a dog-care chat assistant that, once you've scanned a dog, tailors every answer to *that breed*. Tappable breed-specific quick-questions (grooming, feeding, exercise, environment, training, health) appear automatically.
3. **📋 Care Plan** — one tap generates a personalized plan (feeding, grooming, exercise, environment, training, health & vet). View it as a card, **download it as a PDF**, or print it.
4. **📖 Storybook** — turns your dog's photo into a short, interactive AI story starring your pup, **narrated aloud with an ElevenLabs voice**. Flip through the pages and press play.

The scanned dog's profile is shared across all four tabs, so the whole app feels like one companion that knows *your* dog.

## How it works

- Frontend is a single `index.html` (no build step; light + dark mode).
- Two Vercel serverless functions keep your API keys server-side — never exposed to the browser:
  - `api/gemini.js` — breed ID, chat, care plan, and story generation. **Auto-detects a current Gemini model**, so it won't break when model names change.
  - `api/elevenlabs.js` — text-to-speech narration. **Auto-selects an available voice** on your account.

```
index.html         → UI (scan · chat · care plan · storybook)
api/gemini.js       → Gemini proxy (identify / chat / careplan / story)
api/elevenlabs.js   → ElevenLabs TTS proxy (narration)
vercel.json         → function config
```

## Deploy to Vercel

### 1. Get your API keys
- **Gemini (required):** <https://aistudio.google.com/apikey> → Create API key.
- **ElevenLabs (optional, enables narration):** <https://elevenlabs.io> → sign up → Profile → API Keys. The free tier is enough for demos.

### 2. Push to GitHub, import into Vercel
- Import the repo at <https://vercel.com/new>. Framework preset: **Other**.
- Add **Environment Variables**:
  - `GEMINI_API_KEY` = *(your Gemini key)*
  - `ELEVENLABS_API_KEY` = *(your ElevenLabs key)* — optional; skip it and everything except narration still works.
  - `ELEVENLABS_VOICE_ID` = *(optional)* pin a specific voice; otherwise a good default is auto-selected.
- Deploy. You'll get a `https://your-app.vercel.app` URL.

> Whenever you change env vars, **redeploy** (Deployments → ⋯ → Redeploy) so the new values take effect.

### Local dev
```bash
cp .env.example .env.local   # paste your real keys
vercel dev
```

## Tech
- **Google Gemini** — vision breed ID, breed-aware chat, structured JSON care plans, and story generation.
- **ElevenLabs** — natural-voice narration for the storybook.
- **Vanilla HTML/CSS/JS + jsPDF** (via CDN) — zero-install frontend, instant load, PDF export.
- **Vercel serverless functions** — secure API-key handling.

## Notes for judges
Fetch gives general guidance, not veterinary diagnosis, and defers to a real vet for emergencies. Breed ID is a best-effort AI guess, most reliable for a single clearly-visible dog. Built during the challenge window (Aug 14–17, 2026). 🧡
