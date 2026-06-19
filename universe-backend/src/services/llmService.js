/**
 * LLM Service — Smart router
 *
 * Priority:
 *   1. Ollama (local)  — if OLLAMA available
 *   2. Groq  (cloud)   — if GROQ_API_KEY set
 *   3. Fallback        — rule-based responses
 */
const fetch = require("node-fetch");

const OLLAMA_BASE = process.env.OLLAMA_URL   || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "universe-ai";
const EMBED_MODEL  = process.env.OLLAMA_EMBED || "nomic-embed-text";

// ── Ollama ──────────────────────────────────────────────────────
async function isOllamaAvailable() {
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 2000);
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: ctrl.signal });
    return res.ok;
  } catch { return false; }
}

async function ollamaChat({ system, messages, temperature = 0.65, maxTokens = 800 }) {
  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [{ role: "system", content: system }, ...messages],
      stream:   false,
      options:  { temperature, num_predict: maxTokens, top_p: 0.9 },
    }),
  });
  const data = await res.json();
  return data.message?.content || "";
}

async function ollamaEmbed(text) {
  const res = await fetch(`${OLLAMA_BASE}/api/embed`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ model: EMBED_MODEL, input: text }),
  });
  const data = await res.json();
  return data.embeddings?.[0] || data.embedding || null;
}

// ── Groq ────────────────────────────────────────────────────────
const Groq = require("groq-sdk");
let _groq = null;
function getGroq() {
  if (!process.env.GROQ_API_KEY) return null;
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}

async function groqChat({ system, messages, temperature = 0.65, maxTokens = 800 }) {
  const groq = getGroq();
  if (!groq) throw new Error("GROQ_API_KEY not set");
  const resp = await groq.chat.completions.create({
    model:       process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    messages:    [{ role: "system", content: system }, ...messages],
    temperature,
    max_tokens:  maxTokens,
    top_p:       0.9,
  });
  return resp.choices[0]?.message?.content || "";
}

// ── Public API ──────────────────────────────────────────────────
async function chat(opts) {
  // 1. Try Ollama
  const ollamaOk = await isOllamaAvailable();
  if (ollamaOk) {
    try   { return { text: await ollamaChat(opts), engine: "ollama" }; }
    catch (e) { console.warn("[LLM] Ollama failed:", e.message); }
  }
  // 2. Try Groq
  if (process.env.GROQ_API_KEY) {
    try   { return { text: await groqChat(opts), engine: "groq" }; }
    catch (e) { console.warn("[LLM] Groq failed:", e.message); }
  }
  // 3. No engine available
  return { text: null, engine: "none" };
}

async function embed(text) {
  const ollamaOk = await isOllamaAvailable();
  if (ollamaOk) {
    try   { return await ollamaEmbed(text); }
    catch { /* fall through */ }
  }
  return null; // Production uses PostgreSQL FTS instead
}

// Cosine similarity
function cosineSim(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-10);
}

async function listModels() {
  const ok = await isOllamaAvailable();
  if (!ok) return process.env.GROQ_API_KEY ? [`groq:${process.env.GROQ_MODEL||"llama-3.1-8b-instant"}`] : [];
  try {
    const res  = await fetch(`${OLLAMA_BASE}/api/tags`);
    const data = await res.json();
    return (data.models || []).map(m => m.name);
  } catch { return []; }
}

module.exports = {
  chat, embed, cosineSim, isOllamaAvailable, listModels,
  CHAT_MODEL: OLLAMA_MODEL, EMBED_MODEL,
};
