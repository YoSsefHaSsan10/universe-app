/**
 * RAG (Retrieval-Augmented Generation) Service
 *
 * • When Ollama is running  → uses vector embeddings + cosine similarity
 * • When deployed (no Ollama) → falls back to PostgreSQL Full-Text Search
 *   (zero extra packages required — plain pg)
 */
const pool = require("../config/db");
const llm  = require("./llmService");

/* ── Index a single document ───────────────────────────────────── */
async function indexDocument({ source_type, source_id, title, content }) {
  try {
    const embedding = await llm.embed(title + "\n" + content);

    await pool.query(`
      INSERT INTO knowledge_embeddings (source_type, source_id, title, content, embedding)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT DO NOTHING
    `, [source_type, source_id || null, title, content,
        embedding ? JSON.stringify(embedding) : null]);
    return true;
  } catch (err) {
    console.error("[RAG] Index error:", err.message);
    return false;
  }
}

/* ── Index all course materials ────────────────────────────────── */
async function indexCourseMaterials() {
  const { rows } = await pool.query(`
    SELECT cm.id, cm.title, cm.description, cm.material_type, c.name AS course_name
    FROM course_materials cm JOIN courses c ON c.id = cm.course_id
    WHERE cm.id NOT IN (
      SELECT source_id FROM knowledge_embeddings
      WHERE source_type='course_material' AND source_id IS NOT NULL
    )
  `);
  let count = 0;
  for (const r of rows) {
    const ok = await indexDocument({
      source_type: "course_material",
      source_id:   r.id,
      title:       `${r.course_name}: ${r.title}`,
      content:     r.description || r.title,
    });
    if (ok) count++;
  }
  return count;
}

/* ── Index recent announcements ────────────────────────────────── */
async function indexAnnouncements() {
  const { rows } = await pool.query(`
    SELECT a.id, a.title, a.content
    FROM announcements a
    WHERE a.id NOT IN (
      SELECT source_id FROM knowledge_embeddings
      WHERE source_type='announcement' AND source_id IS NOT NULL
    )
    ORDER BY a.created_at DESC LIMIT 50
  `);
  let count = 0;
  for (const r of rows) {
    const ok = await indexDocument({
      source_type: "announcement",
      source_id:   r.id,
      title:       r.title,
      content:     r.content,
    });
    if (ok) count++;
  }
  return count;
}

/* ── Index built-in knowledge base (from training pairs) ────────── */
async function indexKnowledgeBase() {
  const { rows } = await pool.query(`
    SELECT id, question AS title, answer AS content, category
    FROM ai_training_pairs
    WHERE id NOT IN (
      SELECT source_id FROM knowledge_embeddings
      WHERE source_type='faq' AND source_id IS NOT NULL
    )
  `);
  let count = 0;
  for (const r of rows) {
    const ok = await indexDocument({
      source_type: "faq",
      source_id:   r.id,
      title:       r.title,
      content:     r.content,
    });
    if (ok) count++;
  }
  return count;
}

/* ── Vector search (Ollama available) ───────────────────────────── */
async function vectorSearch(queryEmbed, topK) {
  const { rows } = await pool.query(
    "SELECT id, source_type, title, content, embedding FROM knowledge_embeddings WHERE embedding IS NOT NULL"
  );
  const scored = rows.map(r => {
    const emb = Array.isArray(r.embedding) ? r.embedding : JSON.parse(r.embedding);
    return { ...r, score: llm.cosineSim(queryEmbed, emb) };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).filter(r => r.score > 0.3);
}

/* ── PostgreSQL Full-Text Search (production fallback) ────────────
   Used when Ollama embed model is unavailable (e.g. cloud deployment)
   Requires no extra packages — plain SQL                           */
async function ftsSearch(query, topK) {
  try {
    // Sanitize for tsquery: remove special chars, join words with &
    const tsQuery = query
      .replace(/[^\w\s]/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .join(" & ");

    if (!tsQuery) return [];

    const { rows } = await pool.query(`
      SELECT id, source_type, title, content,
             ts_rank(
               to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,'')),
               to_tsquery('english', $1)
             ) AS score
      FROM knowledge_embeddings
      WHERE to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,''))
            @@ to_tsquery('english', $1)
      ORDER BY score DESC
      LIMIT $2
    `, [tsQuery, topK]);

    return rows;
  } catch (err) {
    console.error("[RAG] FTS error:", err.message);
    return [];
  }
}

/* ── Main search: vector when possible, FTS otherwise ───────────── */
async function search(query, topK = 4) {
  try {
    const queryEmbed = await llm.embed(query);

    if (queryEmbed) {
      // Full vector search
      return await vectorSearch(queryEmbed, topK);
    } else {
      // Production fallback — PostgreSQL FTS
      return await ftsSearch(query, topK);
    }
  } catch (err) {
    console.error("[RAG] Search error:", err.message);
    return [];
  }
}

/* ── Full re-index ──────────────────────────────────────────────── */
async function reindexAll() {
  const m = await indexCourseMaterials();
  const a = await indexAnnouncements();
  const f = await indexKnowledgeBase();
  console.log(`[RAG] Indexed: ${m} materials, ${a} announcements, ${f} FAQ`);
  return { materials: m, announcements: a, faq: f };
}

module.exports = {
  indexDocument, search, reindexAll,
  indexCourseMaterials, indexAnnouncements, indexKnowledgeBase,
};
