---
title: "Fetch — scan your dog, then chat, plan & hear their story 🐕"
published: false
tags: devchallenge, weekendchallenge, googleai, elevenlabs
---

*This is a submission for the [DEV Weekend Challenge: Dog Days Edition](https://dev.to/challenges).*

## What I Built

**Fetch** is an AI dog companion that starts with a single photo and turns it into an entire experience. Scan your dog once, and every part of the app then *knows* your pup:

- **📸 Breed Scanner** — snap or upload a photo and Fetch identifies the most likely breed, confidence, temperament, size, energy, care tips, and a fun fact.
- **💬 Ask Fetch (breed-aware)** — a friendly dog-care chat that tailors every answer to *your* dog's breed. After a scan it even suggests breed-specific questions — grooming, feeding, exercise, environment, training, health — one tap away.
- **📋 Care Plan** — one tap generates a personalized care plan (feeding, grooming, exercise, environment, training, health & vet), which you can read as a card, **download as a PDF**, or print.
- **📖 Storybook** — turns your dog's photo into a short, interactive, **AI-narrated storybook** starring your pup. Flip through the pages and press play to hear it read aloud.

The magic is that it's all *connected*: the dog you scan becomes the hero of the chat, the plan, and the story.

## Demo

🔗 **Live app:** _<add your Vercel URL here>_
💻 **Code:** _<add your GitHub repo link here>_

<!-- Add screenshots / a short screen recording:
     1) breed scanner result, 2) breed-aware chat, 3) care plan card, 4) storybook page playing narration -->

## How I Used Google AI

**Google Gemini** is the brain behind four different jobs, all through one serverless endpoint:

- **Vision breed ID** — the photo is sent to Gemini as inline image data; it returns a **strict JSON** breed profile (using Gemini's JSON response mode, so rendering is reliable).
- **Breed-aware chat** — the scanned profile is folded into the system instruction, so answers are specific to the breed and its needs.
- **Structured care plans** — Gemini returns a sectioned JSON plan that I render into a card and a PDF.
- **Story generation** — Gemini writes a short, wholesome 5-page story starring the user's dog by name.

To keep it robust for the challenge window, the function **auto-detects a current Gemini model** from the API instead of hard-coding one — so a model rename can't break the live demo.

## How I Used ElevenLabs

The **Storybook** narration is powered by **ElevenLabs text-to-speech**. Each page's text is sent to a serverless proxy that calls ElevenLabs and streams back MP3 audio, which plays in the browser. The function **auto-selects a narration-friendly voice** available on the account, so it works without manual voice configuration. It's what turns a wall of text into something a kid (or a very good dog) would actually want to sit through.

## How It's Built

```
index.html          → the whole UI (scan · chat · care plan · storybook)
api/gemini.js        → Gemini proxy: identify / chat / careplan / story
api/elevenlabs.js    → ElevenLabs TTS proxy: narration
```

The most important design decision: **neither API key ever touches the browser.** The frontend only talks to my own serverless functions, which read the keys from server-side environment variables. That means the live demo is safe to share publicly.

Everything else is deliberately lightweight — vanilla HTML/CSS/JS with jsPDF from a CDN, no framework, no bundler. It loads instantly and works the same on a phone at the dog park as on a laptop.

## What I'd Add Next

- A care calendar that turns the plan into reminders.
- Multi-dog detection for group photos.
- Letting users pick the narrator's voice per story.

Thanks for a fun prompt — any excuse to spend a weekend building for dogs. 🐶

---

*Fetch offers general guidance, not veterinary diagnosis. For emergencies, always contact your vet.*
