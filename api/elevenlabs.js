// Vercel serverless function — proxies text-to-speech to ElevenLabs.
// The ElevenLabs API key lives ONLY here (server-side env var), never in the browser.
// Returns base64-encoded MP3 audio that the frontend plays.

const BASE = "https://api.elevenlabs.io/v1";

let cachedVoice = null; // resolved once per warm instance

// Pick a usable voice: prefer an env override, else the first available voice on the account.
async function resolveVoice(apiKey) {
  if (process.env.ELEVENLABS_VOICE_ID) return process.env.ELEVENLABS_VOICE_ID;
  if (cachedVoice) return cachedVoice;

  const res = await fetch(`${BASE}/voices`, { headers: { "xi-api-key": apiKey } });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.detail?.message || "Couldn't list ElevenLabs voices for this API key.");
  }
  const voices = data.voices || [];
  if (!voices.length) throw new Error("No ElevenLabs voices available for this API key.");

  // Prefer a warm, narration-friendly premade voice if present.
  const preferred = voices.find((v) =>
    /rachel|bella|antoni|elli|domi|storyteller|narrat/i.test(`${v.name} ${v.category || ""}`)
  );
  cachedVoice = (preferred || voices[0]).voice_id;
  return cachedVoice;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server is missing ELEVENLABS_API_KEY. Set it in your Vercel env vars to enable narration." });
    return;
  }

  try {
    const payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    let text = (payload.text || "").toString().trim();
    if (!text) { res.status(400).json({ error: "No text to narrate." }); return; }
    if (text.length > 800) text = text.slice(0, 800); // keep free-tier character usage sane

    const voiceId = await resolveVoice(apiKey);

    const ttsRes = await fetch(`${BASE}/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
      }),
    });

    if (!ttsRes.ok) {
      let msg = `ElevenLabs error (${ttsRes.status}).`;
      try { const e = await ttsRes.json(); msg = e?.detail?.message || e?.detail || msg; } catch {}
      res.status(ttsRes.status).json({ error: msg });
      return;
    }

    const buf = Buffer.from(await ttsRes.arrayBuffer());
    res.status(200).json({ audio: buf.toString("base64") });
  } catch (err) {
    res.status(500).json({ error: err.message || "Unexpected narration error." });
  }
}
