require("dotenv").config();

const express    = require("express");
const cors       = require("cors");
const helmet     = require("helmet");
const path       = require("path");
const rateLimit  = require("express-rate-limit");
const routes     = require("./routes");

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── SECURITY ────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,  // App uses inline styles + Google Fonts
}));

// CORS — allow the configured CLIENT_URL plus common localhost ports for dev
const ALLOWED_ORIGINS = new Set([
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
].filter(Boolean));

const isDev = process.env.NODE_ENV !== "production";
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.has(origin)) return cb(null, true);
    // Allow any localhost/127.0.0.1 port in development
    if (isDev && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// Rate limit: relaxed in dev, strict in prod
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      process.env.NODE_ENV === "production" ? 100 : 1000,
  message:  { error: "Too many requests, please try again later." },
}));

// ─── BODY PARSING ────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── HEALTH CHECK ────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── STATIC — uploaded course materials ──────────────────────
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ─── API ROUTES ───────────────────────────────────────────────
app.use("/api", routes);

// ─── FRONTEND (production only) ───────────────────────────────
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(__dirname, "../../universe-app/dist");
  app.use(express.static(distPath));
  app.get(/^\/(?!api|uploads|health).*/, (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// ─── 404 ──────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─── GLOBAL ERROR HANDLER ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ─── CRASH GUARD ─────────────────────────────────────────────
process.on("uncaughtException",  (err) => console.error("Uncaught exception:", err.message));
process.on("unhandledRejection", (err) => console.error("Unhandled rejection:", err?.message || err));

// ─── START ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`UniVerse API running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);

  // Start background jobs
  const { startCronJobs } = require("./services/cronService");
  startCronJobs();
});
