---
title: "Fetch — an AI dog companion that reads any pup 🐕"
published: false
tags: devchallenge, weekendchallenge, googleai, webdev
---

*This is a submission for the [DEV Weekend Challenge: Dog Days Edition](https://dev.to/challenges).*

## What I Built

**Fetch** is a tiny, fast web app that turns Google's Gemini model into a pocket dog expert. It does two things dog people actually want:

- **📸 Breed Scanner** — snap or upload a photo of a dog and Fetch tells you the most likely breed, how confident it is, the dog's temperament, size, energy level, a few practical care tips, and a fun fact. If you point it at something that *isn't* a dog, it politely says so. 🐾
- **💬 Ask Fetch** — a warm, no-nonsense dog-care chat assistant for the everyday questions: *"Is chocolate really that dangerous?"*, *"How much exercise does a puppy need?"*, *"How do I start crate training?"* It's friendly, concise, and it always tells you to call a real vet for anything that sounds like an emergency.

The whole thing is one HTML file plus a single serverless function. No sign-up, no app to install — just open it and go.

## Demo

🔗 **Live app:** _<add your Vercel URL here>_
💻 **Code:** _<add your GitHub repo link here>_

<!-- Drop a screenshot or a short screen recording here.
     Suggested shots: the breed scanner result card, and a chat exchange. -->

## How I Used Google AI

This project leans on **Google Gemini** (`gemini-2.0-flash`) for everything intelligent:

- **Vision breed ID.** The uploaded photo is sent to Gemini as inline image data, and I ask it to return a **strict JSON object** (breed, confidence, temperament, size, energy, care tips, fun fact). Gemini's JSON response mode makes the result reliable to render — no brittle string parsing, no hallucinated markdown.
- **Guardrailed chat.** A system instruction gives Fetch its personality *and* its safety rails: be practical and friendly, never pretend to be a vet, and escalate anything involving injury or poisoning to a professional immediately. Conversation history is passed back so it remembers the thread.

Both features run through **one** serverless endpoint (`/api/gemini`) with a `mode` flag, which keeps the surface area tiny.

## How It's Built

```
index.html      → the entire UI (vanilla HTML/CSS/JS, light + dark mode, mobile-first)
api/gemini.js   → Vercel serverless proxy: identify + chat
```

The most important design decision: **the API key never touches the browser.** The frontend talks only to my own `/api/gemini` function, which reads `GEMINI_API_KEY` from a server-side environment variable and forwards the request to Google. That means the live demo is safe to share publicly without leaking credentials — a detail that's easy to skip in a weekend build but matters the moment you deploy.

Everything else is deliberately dependency-free: no framework, no bundler, no npm install for the frontend. It loads instantly and works the same on a phone at the dog park as on a laptop.

## What I'd Add Next

- A "care calendar" that turns breed-specific advice into reminders (grooming, vet checks, exercise targets).
- Multi-dog detection for group photos.
- A voice mode so you can ask Fetch hands-free on a walk.

Thanks for a fun prompt — any excuse to spend a weekend building for dogs. 🐶

---

*Fetch offers general guidance, not veterinary diagnosis. For emergencies, always contact your vet.*
