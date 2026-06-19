const pool = require("../config/db");
const llm  = require("../services/llmService");
const rag  = require("../services/ragService");

/* ═══════════════════════════════════════════════════════════════
   REAL-TIME CONTEXT — fetch user's live data to inject into prompt
═══════════════════════════════════════════════════════════════ */
async function getUserContext(userId) {
  try {
    const now     = new Date();
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [courses, tasks, events, streak, announcements] = await Promise.all([
      // Enrolled courses
      pool.query(`
        SELECT c.name, c.code, cm.role
        FROM course_members cm JOIN courses c ON c.id = cm.course_id
        WHERE cm.user_id = $1 LIMIT 10
      `, [userId]),

      // Upcoming tasks (next 7 days, not completed)
      pool.query(`
        SELECT title, due_date, priority, completed
        FROM tasks
        WHERE user_id = $1 AND completed = FALSE
          AND due_date IS NOT NULL AND due_date <= $2
        ORDER BY due_date ASC LIMIT 8
      `, [userId, weekEnd]),

      // Upcoming events (next 7 days — enrolled courses, approved clubs, or global)
      pool.query(`
        SELECT e.title, e.type, e.start_time, c.name AS course_name, cl.name AS club_name
        FROM events e
        LEFT JOIN courses c  ON c.id  = e.course_id
        LEFT JOIN clubs   cl ON cl.id = e.club_id
        WHERE (
          e.course_id IN (SELECT course_id FROM course_members WHERE user_id = $1)
          OR e.club_id IN (SELECT club_id FROM club_members WHERE user_id = $1 AND status = 'approved')
          OR (e.course_id IS NULL AND e.club_id IS NULL)
        )
          AND e.start_time BETWEEN $2 AND $3
        ORDER BY e.start_time ASC LIMIT 8
      `, [userId, now, weekEnd]),

      // Study streak
      pool.query(
        "SELECT current_streak, longest_streak FROM study_streaks WHERE user_id = $1",
        [userId]
      ),

      // Recent announcements (enrolled courses + system-wide)
      pool.query(`
        SELECT a.title, a.content, c.name AS course_name
        FROM announcements a
        LEFT JOIN courses c ON c.id = a.course_id
        WHERE a.course_id IN (SELECT course_id FROM course_members WHERE user_id = $1)
           OR a.scope = 'system'
        ORDER BY a.created_at DESC LIMIT 5
      `, [userId]),
    ]);

    return {
      courses:       courses.rows,
      tasks:         tasks.rows,
      events:        events.rows,
      streak:        streak.rows[0] || null,
      announcements: announcements.rows,
    };
  } catch (err) {
    console.error("[AI] Context fetch error:", err.message);
    return { courses: [], tasks: [], events: [], streak: null, announcements: [] };
  }
}

/* ── Format context into readable text for the prompt ──────────── */
function formatContext(ctx, userName) {
  const lines = [`## Real-Time Data for ${userName || "Student"}`];

  if (ctx.courses.length) {
    lines.push("\n### Enrolled Courses");
    ctx.courses.forEach(c => lines.push(`- ${c.name} (${c.code}) — ${c.role}`));
  }

  if (ctx.tasks.length) {
    lines.push("\n### Upcoming Tasks (Next 7 Days)");
    ctx.tasks.forEach(t => {
      const due = t.due_date
        ? new Date(t.due_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
        : "No date";
      lines.push(`- ${t.title} — due ${due}${t.priority === "high" ? " ⚠️ HIGH PRIORITY" : ""}`);
    });
  }

  if (ctx.events.length) {
    lines.push("\n### Upcoming Events (Next 7 Days)");
    ctx.events.forEach(e => {
      const d   = new Date(e.start_time).toLocaleDateString("en-US", {
        weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
      });
      const src = e.course_name || e.club_name || "Personal";
      lines.push(`- ${e.title} (${e.type}) — ${d} · ${src}`);
    });
  }

  if (ctx.streak) {
    lines.push(`\n### Study Streak: 🔥 ${ctx.streak.current_streak} days (best: ${ctx.streak.longest_streak})`);
  }

  if (ctx.announcements.length) {
    lines.push("\n### Recent Announcements");
    ctx.announcements.slice(0, 3).forEach(a => {
      const preview = a.content.length > 120 ? a.content.slice(0, 120) + "…" : a.content;
      lines.push(`- **${a.title}** (${a.course_name || "University"}): ${preview}`);
    });
  }

  return lines.join("\n");
}

/* ═══════════════════════════════════════════════════════════════
   INTENT DETECTION (used for badge display + fallback routing)
═══════════════════════════════════════════════════════════════ */
function detectIntent(msg) {
  const t = msg.toLowerCase();
  if (/^(hi|hello|hey|morning|sup|yo)\b/.test(t))              return "greeting";
  if (/\btoday\b/.test(t) && /schedule|class|event/.test(t))   return "today_schedule";
  if (/\btomorrow\b/.test(t))                                    return "tomorrow_schedule";
  if (/this week|week schedule/.test(t))                         return "week_schedule";
  if (/task|assignment|homework|deadline|due/.test(t))           return "tasks";
  if (/my courses?|enrolled/.test(t))                            return "my_courses";
  if (/motivat|stress|overwhelmed|tired/.test(t))                return "motivation";
  if (/study tip|how to study|study plan/.test(t))               return "study";
  if (/pomodoro|focus|productive/.test(t))                       return "pomodoro";
  return "unknown";
}

/* ── Rule-based fallback (used when no LLM engine is available) ─── */
const FALLBACK_RESPONSES = {
  greeting:         "Hello! I'm UniVerse AI. No AI engine is available right now — I'm in basic mode. Start Ollama locally or set a GROQ_API_KEY for full AI responses.",
  today_schedule:   "I'd love to show your schedule, but full AI mode isn't available right now.",
  tomorrow_schedule:"Tomorrow's schedule requires full AI mode. Please configure an LLM engine.",
  week_schedule:    "Weekly schedule overview requires full AI mode.",
  tasks:            "I can see your tasks in the platform — check your Tasks page for a full list.",
  my_courses:       "Your enrolled courses are shown in the Courses section of the platform.",
  motivation:       "You're doing great! Keep going. 💪 (Full AI responses need an LLM engine.)",
  study:            "Best study tip: use the Pomodoro technique — 25 min focus, 5 min break.",
  pomodoro:         "Try the built-in Pomodoro timer in the Productivity section!",
  unknown:          "I'm currently in basic mode. To enable full AI responses, start Ollama locally (`ollama serve`) or add a GROQ_API_KEY to the server environment.",
};

/* ═══════════════════════════════════════════════════════════════
   MAIN CHAT HANDLER
═══════════════════════════════════════════════════════════════ */
const chat = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ answer: "Please log in first.", intent: "error" });

    const { message, history = [] } = req.body;
    if (!message?.trim()) return res.status(400).json({ answer: "Please write a message.", intent: "error" });

    const intent = detectIntent(message);

    // ── Fetch real-time context + RAG results in parallel ─────────
    const [ctx, ragResults] = await Promise.all([
      getUserContext(userId),
      rag.search(message, 3),
    ]);

    // ── Build system prompt ───────────────────────────────────────
    const ctxText    = formatContext(ctx, req.user.full_name);
    const ragContext = ragResults.length
      ? "\n\n## Relevant Knowledge\n" +
        ragResults.map(r => `### ${r.title}\n${r.content}`).join("\n\n")
      : "";

    const systemPrompt =
      `You are UniVerse AI — an intelligent academic assistant for the UniVerse University Platform.\n\n` +
      `${ctxText}${ragContext}\n\n` +
      `Answer the student's question using the real-time data above when relevant. ` +
      `Be helpful, concise, and encouraging. Use markdown formatting.`;

    // ── Build message history (last 6 turns) ─────────────────────
    const historyMsgs = history.slice(-6).map(m => ({
      role:    m.role === "user" ? "user" : "assistant",
      content: m.text,
    }));
    historyMsgs.push({ role: "user", content: message });

    // ── Call smart LLM router (Ollama → Groq → none) ─────────────
    const { text, engine } = await llm.chat({
      system:      systemPrompt,
      messages:    historyMsgs,
      temperature: 0.65,
      maxTokens:   800,
    });

    // ── No engine available — graceful fallback ───────────────────
    if (!text) {
      return res.json({
        intent,
        answer:  FALLBACK_RESPONSES[intent] || FALLBACK_RESPONSES.unknown,
        mode:    "fallback",
        warning: "No AI engine available. Start Ollama or set GROQ_API_KEY.",
      });
    }

    res.json({ answer: text, intent, mode: engine });

  } catch (err) {
    console.error("[AI] Chat error:", err.message);
    res.status(500).json({ answer: "An error occurred. Please try again.", intent: "error" });
  }
};

/* ═══════════════════════════════════════════════════════════════
   ADMIN ENDPOINTS
═══════════════════════════════════════════════════════════════ */

// GET /api/ai/status
const getStatus = async (req, res) => {
  try {
    const ollamaOk = await llm.isOllamaAvailable();
    const models   = await llm.listModels();
    const { rows: embCount  } = await pool.query("SELECT COUNT(*) FROM knowledge_embeddings");
    const { rows: pairCount } = await pool.query("SELECT COUNT(*) FROM ai_training_pairs");

    res.json({
      ollama_running:  ollamaOk,
      groq_configured: !!process.env.GROQ_API_KEY,
      active_engine:   ollamaOk ? "ollama" : (process.env.GROQ_API_KEY ? "groq" : "fallback"),
      models,
      chat_model:      llm.CHAT_MODEL,
      embed_model:     llm.EMBED_MODEL,
      embeddings:      parseInt(embCount[0].count),
      training_pairs:  parseInt(pairCount[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/ai/reindex — re-embed all documents
const reindex = async (req, res) => {
  try {
    const result = await rag.reindexAll();
    const ollamaOk = await llm.isOllamaAvailable();
    res.json({
      message: "Reindex complete",
      engine_used: ollamaOk ? "ollama-embed" : "text-only (FTS)",
      ...result,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/ai/training-pairs — add new Q&A pair
const addTrainingPair = async (req, res) => {
  const { question, answer, category } = req.body;
  if (!question?.trim() || !answer?.trim())
    return res.status(400).json({ error: "question + answer required" });

  const { rows } = await pool.query(
    "INSERT INTO ai_training_pairs (question, answer, category) VALUES ($1,$2,$3) RETURNING *",
    [question, answer, category || "general"]
  );
  res.status(201).json(rows[0]);
};

// GET /api/ai/training-pairs
const getTrainingPairs = async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM ai_training_pairs ORDER BY created_at DESC");
  res.json(rows);
};

// DELETE /api/ai/training-pairs/:id
const deleteTrainingPair = async (req, res) => {
  await pool.query("DELETE FROM ai_training_pairs WHERE id = $1", [req.params.id]);
  await pool.query(
    "DELETE FROM knowledge_embeddings WHERE source_type = 'faq' AND source_id = $1",
    [req.params.id]
  );
  res.json({ message: "Deleted" });
};

module.exports = { chat, getStatus, reindex, addTrainingPair, getTrainingPairs, deleteTrainingPair };
