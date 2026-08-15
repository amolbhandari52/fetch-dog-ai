// Vercel serverless function — proxies requests to Google Gemini.
// The API key lives ONLY here (server-side env var), never in the browser.

const MODEL = "gemini-2.0-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// System instruction that gives Fetch its personality + safety guardrails.
const PERSONA =
  "You are Fetch, a warm, upbeat AI dog companion. You help people care for their dogs: " +
  "training, nutrition, behaviour, breeds, and general wellbeing. Keep answers friendly, practical, " +
  "and concise (a short paragraph or a few tight bullet points). You are NOT a veterinarian: for anything " +
  "involving injury, poisoning, breathing trouble, or a possible emergency, clearly tell the user to contact " +
  "a vet right away. Never invent medical certainty. A little doggy warmth (an occasional 'woof' or 🐾) is welcome, " +
  "but stay genuinely helpful.";

async function callGemini(body, apiKey) {
  const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || `Gemini API error (${res.status}).`;
    throw new Error(msg);
  }
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
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
    // Vercel parses JSON bodies automatically; fall back just in case.
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
      const { message, history } = payload;
      if (!message) { res.status(400).json({ error: "No message provided." }); return; }

      const contents = (Array.isArray(history) ? history : [])
        .filter(h => h && h.text)
        .map(h => ({ role: h.role === "model" ? "model" : "user", parts: [{ text: String(h.text) }] }));
      // Ensure the latest user message is present.
      if (!contents.length || contents[contents.length - 1].role !== "user") {
        contents.push({ role: "user", parts: [{ text: String(message) }] });
      }

      const body = {
        systemInstruction: { parts: [{ text: PERSONA }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
      };

      const reply = await callGemini(body, apiKey);
      res.status(200).json({ reply });
      return;
    }

    res.status(400).json({ error: "Unknown mode." });
  } catch (err) {
    res.status(500).json({ error: err.message || "Unexpected server error." });
  }
}
