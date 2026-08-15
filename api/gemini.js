// Vercel serverless function — proxies requests to Google Gemini.
// The API key lives ONLY here (server-side env var), never in the browser.
//
// Model names change over time, so instead of hard-coding one (which can get
// retired), we ASK the API which models this key can use and pick the best
// current Flash model automatically. The choice is cached per warm instance.

const BASE = "https://generativelanguage.googleapis.com/v1beta";

// Persona + safety guardrails for the chat assistant.
const PERSONA =
  "You are Fetch, a warm, upbeat AI dog companion. You help people care for their dogs: " +
  "training, nutrition, behaviour, breeds, and general wellbeing. Keep answers friendly, practical, " +
  "and concise (a short paragraph or a few tight bullet points). You are NOT a veterinarian: for anything " +
  "involving injury, poisoning, breathing trouble, or a possible emergency, clearly tell the user to contact " +
  "a vet right away. Never invent medical certainty. A little doggy warmth (an occasional 'woof' or 🐾) is welcome, " +
  "but stay genuinely helpful.";

let cachedModel = null; // e.g. "gemini-2.5-flash" — resolved once, reused while warm.

// Discover a good current Flash model that supports generateContent + vision.
async function resolveModel(apiKey) {
  if (cachedModel) return cachedModel;

  const res = await fetch(`${BASE}/models?key=${apiKey}&pageSize=200`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Couldn't list Gemini models for this API key.");
  }

  const usable = (data.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
    .map((m) => (m.name || "").replace(/^models\//, ""))
    .filter(Boolean);

  if (!usable.length) throw new Error("No Gemini models available for this API key.");

  // Score: prefer 'flash', prefer 'latest' aliases and newer version numbers,
  // avoid image-generation / tts / embedding / lite / experimental variants.
  const score = (n) => {
    let s = 0;
    if (/flash/.test(n)) s += 100;
    if (/latest/.test(n)) s += 40;
    if (/(image|tts|embedding|aqa|audio|native-audio|thinking)/.test(n)) s -= 300;
    if (/lite/.test(n)) s -= 8;
    if (/(preview|exp)/.test(n)) s -= 4;
    const ver = parseFloat((n.match(/gemini-(\d+(?:\.\d+)?)/) || [])[1] || "0");
    s += ver * 3;
    return s;
  };

  usable.sort((a, b) => score(b) - score(a));
  cachedModel = usable[0];
  return cachedModel;
}

async function callGemini(body, apiKey) {
  // Resolve model, call it, and if it 404s (retired) re-resolve once and retry.
  let model = await resolveModel(apiKey);

  const doCall = async (m) => {
    const res = await fetch(`${BASE}/models/${m}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  };

  let r = await doCall(model);
  if (!r.ok && (r.status === 404 || /not.*(found|available|supported)/i.test(r.data?.error?.message || ""))) {
    cachedModel = null; // bust the cache and try to find another model
    model = await resolveModel(apiKey);
    r = await doCall(model);
  }

  if (!r.ok) {
    throw new Error(r.data?.error?.message || `Gemini API error (${r.status}).`);
  }
  const text = r.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Fetch couldn't come up with an answer. Try again!");
  return text;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server is missing GEMINI_API_KEY. Set it in your Vercel env vars." });
    return;
  }

  try {
    const payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { mode } = payload;

    if (mode === "identify") {
      const { imageData, mimeType } = payload;
      if (!imageData) { res.status(400).json({ error: "No image provided." }); return; }

      const prompt =
        "Look at this photo. If it does NOT contain a dog, respond with {\"is_dog\": false}. " +
        "If it contains a dog, identify the most likely breed (or 'Mixed breed') and respond with ONLY a JSON object, " +
        "no markdown, using this exact shape: " +
        "{\"is_dog\": true, \"breed\": string, \"confidence\": number (0-100), " +
        "\"also_possible\": [up to 2 other breed guesses], \"temperament\": short string, " +
        "\"size\": string, \"energy\": string (Low/Medium/High), \"good_with_kids\": string, " +
        "\"lifespan\": string, \"care_tips\": [3 short practical tips], \"fun_fact\": one short surprising fact}.";

      const body = {
        contents: [{
          role: "user",
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType || "image/jpeg", data: imageData } },
          ],
        }],
        generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
      };

      const text = await callGemini(body, apiKey);
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        const m = text.match(/\{[\s\S]*\}/);
        parsed = m ? JSON.parse(m[0]) : { error: "Could not parse result." };
      }
      res.status(200).json(parsed);
      return;
    }

    if (mode === "chat") {
      const { message, history, dogContext } = payload;
      if (!message) { res.status(400).json({ error: "No message provided." }); return; }

      const contents = (Array.isArray(history) ? history : [])
        .filter((h) => h && h.text)
        .map((h) => ({ role: h.role === "model" ? "model" : "user", parts: [{ text: String(h.text) }] }));
      if (!contents.length || contents[contents.length - 1].role !== "user") {
        contents.push({ role: "user", parts: [{ text: String(message) }] });
      }

      // Breed-aware: fold the scanned dog's profile into the system instruction.
      let system = PERSONA;
      if (dogContext && dogContext.breed) {
        system += "\n\nThe user has scanned their dog. Tailor every answer to this specific dog:\n" +
          `Breed: ${dogContext.breed}. ` +
          (dogContext.size ? `Size: ${dogContext.size}. ` : "") +
          (dogContext.energy ? `Energy: ${dogContext.energy}. ` : "") +
          (dogContext.temperament ? `Temperament: ${dogContext.temperament}. ` : "") +
          "When advice differs by breed, give the version that fits this breed, and mention the breed by name.";
      }

      const body = {
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
      };

      const reply = await callGemini(body, apiKey);
      res.status(200).json({ reply });
      return;
    }

    if (mode === "careplan") {
      const { profile, dogName } = payload;
      if (!profile || !profile.breed) { res.status(400).json({ error: "Scan a dog first." }); return; }

      const prompt =
        `Create a personalized care plan for a dog. ${dogName ? `The dog's name is ${dogName}. ` : ""}` +
        `Breed: ${profile.breed}. Size: ${profile.size || "unknown"}. Energy: ${profile.energy || "unknown"}. ` +
        `Temperament: ${profile.temperament || "unknown"}. ` +
        "Respond with ONLY a JSON object, no markdown, in this exact shape: " +
        "{\"dog_name\": string, \"breed\": string, \"sections\": [" +
        "{\"title\":\"Feeding\",\"icon\":\"🍖\",\"tips\":[2-3 short specific tips]}," +
        "{\"title\":\"Grooming\",\"icon\":\"🛁\",\"tips\":[...]}," +
        "{\"title\":\"Exercise\",\"icon\":\"🎾\",\"tips\":[...]}," +
        "{\"title\":\"Environment\",\"icon\":\"🏡\",\"tips\":[...]}," +
        "{\"title\":\"Training\",\"icon\":\"🎓\",\"tips\":[...]}," +
        "{\"title\":\"Health & Vet\",\"icon\":\"🩺\",\"tips\":[...]}" +
        "], \"summary\": one encouraging 1-2 sentence wrap-up}. " +
        "Make tips concrete and specific to this breed's needs.";

      const body = {
        systemInstruction: { parts: [{ text: PERSONA }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, responseMimeType: "application/json" },
      };
      const text = await callGemini(body, apiKey);
      let parsed;
      try { parsed = JSON.parse(text); }
      catch { const m = text.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : { error: "Could not parse plan." }; }
      if (dogName && !parsed.dog_name) parsed.dog_name = dogName;
      if (!parsed.breed) parsed.breed = profile.breed;
      res.status(200).json(parsed);
      return;
    }

    if (mode === "story") {
      const { profile, dogName } = payload;
      if (!profile || !profile.breed) { res.status(400).json({ error: "Scan a dog first." }); return; }
      const hero = dogName || `a brave ${profile.breed}`;

      const prompt =
        `Write a short, wholesome, heart-warming children's story starring ${hero}, a ${profile.breed}` +
        (profile.temperament ? ` who is ${profile.temperament}` : "") + ". " +
        "The story should feel personal and cozy. Respond with ONLY a JSON object, no markdown, in this shape: " +
        "{\"title\": a short fun title, \"pages\": [exactly 5 pages, each {\"text\": 2-3 warm sentences}], " +
        "\"moral\": one short uplifting takeaway}. " +
        "Keep each page short enough to be read aloud in about 15 seconds. Keep it gentle and age-appropriate.";

      const body = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9, responseMimeType: "application/json" },
      };
      const text = await callGemini(body, apiKey);
      let parsed;
      try { parsed = JSON.parse(text); }
      catch { const m = text.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : { error: "Could not parse story." }; }
      res.status(200).json(parsed);
      return;
    }

    res.status(400).json({ error: "Unknown mode." });
  } catch (err) {
    res.status(500).json({ error: err.message || "Unexpected server error." });
  }
}
