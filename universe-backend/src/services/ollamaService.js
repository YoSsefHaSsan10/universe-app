/**
 * Ollama API wrapper — handles chat generation and embeddings.
 * Falls back gracefully if Ollama is not running.
 */
const fetch = require("node-fetch");

const OLLAMA_BASE  = process.env.OLLAMA_URL   || "http://127.0.0.1:11434";
const CHAT_MODEL   = process.env.OLLAMA_MODEL  || "universe-ai";   // our custom model
const EMBED_MODEL  = process.env.OLLAMA_EMBED  || "nomic-embed-text";

/* ── Is Ollama running? ────────────────────────────────────────── */
async function isOllamaAvailable() {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { timeout: 2000 });
    return res.ok;
  } catch { return false; }
}

/* ── List downloaded models ────────────────────────────────────── */
async function listModels() {
  try {
    const res  = await fetch(`${OLLAMA_BASE}/api/tags`);
    const data = await res.json();
    return (data.models || []).map(m => m.name);
  } catch { return []; }
}

/* ── Generate embedding vector for a text ──────────────────────── */
async function embed(text) {
  const res = await fetch(`${OLLAMA_BASE}/api/embed`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ model: EMBED_MODEL, input: text }),
  });
  const data = await res.json();
  // nomic-embed-text returns { embeddings: [[...]] }
  return data.embeddings?.[0] || data.embedding || null;
}

/* ── Chat completion ────────────────────────────────────────────── */
async function chat({ system, messages, temperature = 0.7, maxTokens = 600 }) {
  const body = {
    model:  CHAT_MODEL,
    messages: [
      { role: "system", content: system },
      ...messages,
    ],
    stream:  false,
    options: { temperature, num_predict: maxTokens, top_p: 0.9 },
  };
  const res  = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  const data = await res.json();
  return data.message?.content || "";
}

/* ── Cosine similarity between two float arrays ─────────────────── */
function cosineSim(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
}

module.exports = { isOllamaAvailable, listModels, embed, chat, cosineSim, CHAT_MODEL, EMBED_MODEL };
