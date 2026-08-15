# 🐕 Fetch — Your AI Dog Companion

Point your camera at any pup. **Fetch** is an AI dog companion built for the **DEV Weekend Challenge: Dog Days Edition**. It does two things:

1. **📸 Breed Scanner** — upload a dog photo and Google Gemini's vision model identifies the most likely breed, confidence, temperament, size/energy, care tips, and a fun fact.
2. **💬 Ask Fetch** — a friendly dog-care chat assistant (training, nutrition, behaviour) with sensible "call your vet" safety guardrails.

**Prize category:** Best use of **Google AI** (Gemini).

## How it works

- The whole frontend is a single `index.html` (no build step).
- All AI calls go through one Vercel serverless function, `api/gemini.js`, which proxies to Gemini. **Your API key stays server-side** — it is never exposed to the browser.

```
index.html        → UI (scanner + chat)
api/gemini.js      → serverless proxy (identify + chat)
vercel.json        → routing / function config
```

## Deploy to Vercel (≈5 minutes)

### 1. Get a free Gemini API key
Go to <https://aistudio.google.com/apikey>, sign in with a Google account, and click **Create API key**. Copy it. (Gemini has a free tier that's plenty for this project.)

### 2. Put this folder on GitHub
Create a new repo and push these files, or use the Vercel CLI (below) to deploy straight from your machine.

### 3. Import into Vercel
- Go to <https://vercel.com/new>, import the repo (or drag the folder in).
- Framework preset: **Other** (it's a static site + serverless function — no config needed).
- Before deploying, add an **Environment Variable**:
  - **Name:** `GEMINI_API_KEY`
  - **Value:** *(the key from step 1)*
- Click **Deploy**. Done — you'll get a `https://your-app.vercel.app` URL.

### CLI alternative
```bash
npm i -g vercel
vercel            # first deploy (follow prompts)
vercel env add GEMINI_API_KEY   # paste your key when asked
vercel --prod     # production deploy
```

### Local development
```bash
cp .env.example .env.local     # then paste your real key into .env.local
vercel dev                     # runs the static site + function locally
```

> **Netlify note:** This also works on Netlify — move `api/gemini.js` to `netlify/functions/gemini.js`, change the fetch URL in `index.html` from `/api/gemini` to `/.netlify/functions/gemini`, and set `GEMINI_API_KEY` under Site settings → Environment variables. Vercel is the smoothest path since the `/api` folder works out of the box.

## Tech
- **Google Gemini** (`gemini-2.0-flash`) — vision for breed ID, chat for the assistant, JSON mode for structured results.
- **Vanilla HTML/CSS/JS** — zero dependencies, loads instantly, light + dark mode.
- **Vercel serverless functions** — secure API-key handling.

## Notes for judges
Fetch gives general guidance, not veterinary diagnosis, and always defers to a real vet for emergencies. Breed identification is a best-effort AI guess and is most reliable for a single, clearly-visible dog.

Built during the challenge window (Aug 14–17, 2026) with 🧡.
