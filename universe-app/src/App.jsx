import { useState, useRef, useEffect, createContext, useContext, useCallback } from "react";

const UserContext = createContext(null);
const ToastContext = createContext(() => {});

/* ─── API HELPER ─────────────────────────────────────────────────────────────── */
// VITE_API_URL must be set at build time for production (e.g. https://your-backend.railway.app)
// Falls back to empty string (same-origin) in dev when the Vite proxy is active
const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

function api(path, options = {}) {
  const token = localStorage.getItem("token");
  const url   = path.startsWith("http") ? path : `${API_BASE}${path}`;
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  }).then(r => r.json());
}

/* ─── TOAST ──────────────────────────────────────────────────────────────────── */
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, type = "info") => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  }, []);
  const colors = { info: C.purple, success: C.green, error: C.red, warn: C.orange };
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div style={{ position: "fixed", bottom: 24, right: 24, display: "flex", flexDirection: "column", gap: 8, zIndex: 9999 }}>
        {toasts.map(t => (
          <div key={t.id} className="fade-up" style={{ background: C.card, border: `1px solid ${colors[t.type]}`, borderLeft: `4px solid ${colors[t.type]}`, borderRadius: 10, padding: "12px 18px", fontSize: 13, color: C.text, boxShadow: "0 4px 20px rgba(0,0,0,0.4)", minWidth: 220 }}>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
const useToast = () => useContext(ToastContext);

/* ─── THEME COLOR PALETTES ───────────────────────────────────────────────────── */
const THEMES = {
  dark: {
    bg: "#0d0f1a", sidebar: "#13151f", card: "#161827", cardHover: "#1c1f33",
    border: "#1e2235", borderLight: "#252840",
    purple: "#7c3aed", purpleLight: "#8b5cf6",
    purpleBg: "rgba(124,58,237,0.15)", purpleBg2: "rgba(172,163,186,0.08)",
    text: "#e2e8f0", textMuted: "#6b7280", textDim: "#4b5563",
    blue: "#3b82f6",   blueBg:   "rgba(59,130,246,0.15)",
    green: "#22c55e",  greenBg:  "rgba(34,197,94,0.15)",
    orange: "#f97316", orangeBg: "rgba(249,115,22,0.15)",
    yellow: "#eab308", yellowBg: "rgba(234,179,8,0.15)",
    red: "#ef4444",    redBg:    "rgba(239,68,68,0.15)",
    cyan: "#06b6d4",   cyanBg:   "rgba(6,182,212,0.15)",
    white10: "rgba(255,255,255,0.06)", white15: "rgba(255,255,255,0.1)",
  },
  light: {
    bg: "#f1f5f9", sidebar: "#ffffff", card: "#ffffff", cardHover: "#f8fafc",
    border: "#e2e8f0", borderLight: "#cbd5e1",
    purple: "#7c3aed", purpleLight: "#6d28d9",
    purpleBg: "rgba(124,58,237,0.1)", purpleBg2: "rgba(124,58,237,0.05)",
    text: "#1e293b", textMuted: "#64748b", textDim: "#94a3b8",
    blue: "#2563eb",   blueBg:   "rgba(37,99,235,0.1)",
    green: "#16a34a",  greenBg:  "rgba(22,163,74,0.1)",
    orange: "#ea580c", orangeBg: "rgba(234,88,12,0.1)",
    yellow: "#ca8a04", yellowBg: "rgba(202,138,4,0.1)",
    red: "#dc2626",    redBg:    "rgba(220,38,38,0.1)",
    cyan: "#0891b2",   cyanBg:   "rgba(8,145,178,0.1)",
    white10: "rgba(0,0,0,0.04)", white15: "rgba(0,0,0,0.08)",
  },
  cool: {
    // ⚡ Cyberpunk — deep navy base, electric orange primary, neon blue secondary
    bg: "#07090f", sidebar: "#0b0f1a", card: "#0e1422", cardHover: "#131b2e",
    border: "#162040", borderLight: "#1d2d55",
    purple: "#ff6b00", purpleLight: "#ff9d3f",           // orange replaces purple
    purpleBg: "rgba(255,107,0,0.18)", purpleBg2: "rgba(255,107,0,0.09)",
    text: "#e8f1ff", textMuted: "#5a7a9a", textDim: "#3a5570",
    blue: "#00c8ff",   blueBg:   "rgba(0,200,255,0.15)", // electric blue
    green: "#00ff9f",  greenBg:  "rgba(0,255,159,0.12)", // neon green
    orange: "#ff9500", orangeBg: "rgba(255,149,0,0.18)",
    yellow: "#ffd700", yellowBg: "rgba(255,215,0,0.12)",
    red: "#ff3860",    redBg:    "rgba(255,56,96,0.15)",
    cyan: "#00e5ff",   cyanBg:   "rgba(0,229,255,0.15)",
    white10: "rgba(0,200,255,0.06)", white15: "rgba(0,200,255,0.1)",
  },
};

// Mutable — updated before every render by App so all components see the right colors
let C = { ...THEMES.dark };

const getGlobalCSS = (colors) => `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; }
  body { background: ${colors.bg}; color: ${colors.text}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; -webkit-font-smoothing: antialiased; transition: background 0.25s, color 0.25s; }
  button { cursor: pointer; border: none; outline: none; font-family: inherit; background: transparent; color: inherit; }
  input, textarea, select { font-family: inherit; outline: none; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${colors.border}; border-radius: 4px; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
  .fade-up { animation: fadeUp 0.25s ease both; }
`;

function Svg({ d, size = 16, stroke = "currentColor", fill = "none", sw = 1.6, style = {} }) {
  const paths = Array.isArray(d) ? d : [d];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke}
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

function InitialsAvatar({ name = "?", size = 32, bg = C.purple }) {
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: size * 0.36, flexShrink: 0, letterSpacing: "-0.5px" }}>
      {initials}
    </div>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} style={{ width: 44, height: 24, borderRadius: 12, background: on ? C.purple : C.border, position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
      <div style={{ width: 18, height: 18, borderRadius: "50%", background: "white", position: "absolute", top: 3, left: on ? 23 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }} />
    </button>
  );
}

const avatarColors = ["#3b82f6", "#8b5cf6", "#22c55e", "#f97316", "#ec4899", "#06b6d4", "#eab308", "#ef4444", "#14b8a6"];
const getColor = (name) => avatarColors[Math.abs((name || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % avatarColors.length];


/* ─── SIDEBAR ────────────────────────────────────────────────────────────────── */
function Sidebar({ active, onNav, role, user, courses = [], clubs = [] }) {
  const isInstructor = role === "instructor";
  const isAdmin      = role === "admin";
  const topNav = isAdmin ? [
    { id: "home",                label: "Dashboard",     icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" },
    { id: "admin-users",         label: "Users",         icon: ["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2","M9 7a4 4 0 100 8 4 4 0 000-8z","M23 21v-2a4 4 0 00-3-3.87","M16 3.13a4 4 0 010 7.75"] },
    { id: "admin-courses",       label: "Courses",       icon: "M4 19.5A2.5 2.5 0 016.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" },
    { id: "admin-announcements", label: "Announcements", icon: ["M22 17H2a3 3 0 000 6h1","M18 9a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9","M13.73 21a2 2 0 01-3.46 0"] },
    { id: "admin-messages",      label: "Chat Monitor",  icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" },
    { id: "admin-clubs",         label: "Clubs",         icon: ["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2","M9 7a4 4 0 100 8 4 4 0 000-8z","M23 21v-2a4 4 0 00-3-3.87","M16 3.13a4 4 0 010 7.75"] },
    { id: "admin-analytics",     label: "Analytics",     icon: ["M18 20V10","M12 20V4","M6 20v-6"] },
    { id: "admin-ai",            label: "AI Model",      icon: ["M12 8V4H8","M3 8h18v11a2 2 0 01-2 2H5a2 2 0 01-2-2z","M9 13h.01M15 13h.01"] },
    { id: "calendar",            label: "Calendar",      icon: ["M3 4h18v18H3z","M16 2v4M8 2v4","M3 10h18"] },
    { id: "leaderboard",         label: "Leaderboard",   icon: ["M8 6l4-4 4 4","M12 2v10.3","M20 21H4M16 21v-4a2 2 0 00-2-2h-4a2 2 0 00-2 2v4"] },
    { id: "messages",            label: "Messages",      icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" },
  ] : [
    { id: "home", label: "Home", icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" },
    { id: "calendar", label: "Calendar", icon: ["M3 4h18v18H3z", "M16 2v4M8 2v4", "M3 10h18"] },
    ...(isInstructor
      ? [
        { id: "instructor-courses",       label: "Courses",       icon: "M4 19.5A2.5 2.5 0 016.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" },
        { id: "instructor-announcements", label: "Announcements", icon: ["M22 17H2a3 3 0 000 6h1", "M18 9a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9", "M13.73 21a2 2 0 01-3.46 0"] },
        { id: "messages",                 label: "Messages",      icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" },
        { id: "leaderboard",              label: "Leaderboard",   icon: ["M8 6l4-4 4 4","M12 2v10.3","M20 21H4M16 21v-4a2 2 0 00-2-2h-4a2 2 0 00-2 2v4"] },
      ]
      : [
        { id: "tasks",         label: "Tasks",       icon: "M9 11l3 3L22 4 M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" },
        { id: "grades",        label: "Grades",      icon: ["M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2","M9 5a2 2 0 002 2h2a2 2 0 002-2","M9 12h6","M9 16h4"] },
        { id: "goals",         label: "Goals",       icon: ["M22 11.08V12a10 10 0 11-5.93-9.14","M22 4L12 14.01l-3-3"] },
        { id: "pomodoro",      label: "Focus Timer", icon: ["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z","M12 6v6l4 2"] },
        { id: "messages",      label: "Messages",    icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" },
        { id: "leaderboard",   label: "Leaderboard", icon: ["M8 6l4-4 4 4","M12 2v10.3","M20 21H4M16 21v-4a2 2 0 00-2-2h-4a2 2 0 00-2 2v4"] },
        { id: "badges",        label: "Badges",      icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" },
        { id: "findteam",      label: "Find Team",   icon: ["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2", "M23 21v-2a4 4 0 00-3-3.87", "M16 3.13a4 4 0 010 7.75", "M9 7a4 4 0 100 8 4 4 0 000-8z"] },
        { id: "announcements", label: "Announcements", icon: ["M22 17H2a3 3 0 000 6h1", "M18 9a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9", "M13.73 21a2 2 0 01-3.46 0"] },
        { id: "ai",            label: "AI Assistant", icon: ["M12 8V4H8","M3 8h18v11a2 2 0 01-2 2H5a2 2 0 01-2-2z","M9 13h.01M15 13h.01"] },
      ]
    ),
  ];

  const NavBtn = ({ item }) => {
    const isActive = active === item.id;
    return (
      <button onClick={() => onNav(item.id)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: isActive ? C.purpleBg : "transparent", color: isActive ? C.purpleLight : C.textMuted, fontWeight: isActive ? 600 : 400, fontSize: 14, transition: "all 0.15s", marginBottom: 2, textAlign: "left" }}
        onMouseEnter={e => !isActive && (e.currentTarget.style.background = C.white10)}
        onMouseLeave={e => !isActive && (e.currentTarget.style.background = "transparent")}>
        <Svg d={item.icon} size={16} stroke={isActive ? C.purpleLight : C.textMuted} />
        {item.label}
      </button>
    );
  };

  return (
    <div style={{ width: 200, background: C.sidebar, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0, flexShrink: 0 }}>
      <div style={{ padding: "12px 12px 10px", borderBottom: `1px solid ${C.border}` }}>
        <button onClick={() => onNav("home")} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "6px 4px", borderRadius: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Svg d={["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2", "M9 7a4 4 0 100 8 4 4 0 000-8z", "M23 21v-2a4 4 0 00-3-3.87", "M16 3.13a4 4 0 010 7.75"]} size={17} stroke="white" sw={1.8} />
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.text, lineHeight: 1.2 }}>UniVerse</div>
            <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.2 }}>University Portal</div>
          </div>
          <Svg d="M6 9l6 6 6-6" size={14} stroke={C.textDim} style={{ marginLeft: "auto" }} />
        </button>
      </div>

      <div style={{ padding: "8px 8px 4px" }}>
        {topNav.map(item => <NavBtn key={item.id} item={item} />)}
      </div>

      <div style={{ padding: "4px 8px 0", flex: 1, overflowY: "auto" }}>
        {!isAdmin && <>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 8px 5px" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Courses</span>
          <button style={{ color: C.textMuted, fontSize: 18, lineHeight: 1, padding: "0 2px" }}>+</button>
        </div>
        {courses.map(c => {
          const isActive = active === `course-${c.id}`;
          return (
            <button key={c.id} onClick={() => onNav(`course-${c.id}`)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, background: isActive ? C.white10 : "transparent", color: isActive ? C.text : C.textMuted, fontSize: 13, fontWeight: isActive ? 600 : 400, marginBottom: 1, textAlign: "left", transition: "all 0.15s" }}
              onMouseEnter={e => !isActive && (e.currentTarget.style.background = C.white10)}
              onMouseLeave={e => !isActive && (e.currentTarget.style.background = "transparent")}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
              <Svg d="M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" size={13} stroke={C.textDim} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
            </button>
          );
        })}
        </>}

        {!isInstructor && !isAdmin && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 8px 5px" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Clubs</span>
              <button onClick={() => onNav("clubs-browse")} title="Browse all clubs" style={{ color: C.textMuted, fontSize: 18, lineHeight: 1, padding: "0 2px" }}>+</button>
            </div>
            {clubs.length === 0 && (
              <button onClick={() => onNav("clubs-browse")} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", borderRadius: 6, color: C.textDim, fontSize: 12, textAlign: "left" }}>
                <Svg d={["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2","M9 7a4 4 0 100 8 4 4 0 000-8z"]} size={13} stroke={C.textDim} />
                Browse clubs…
              </button>
            )}
            {clubs.map(cl => {
              const isActive = active === `club-${cl.id}`;
              return (
                <button key={cl.id} onClick={() => onNav(`club-${cl.id}`)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, background: isActive ? C.white10 : "transparent", color: isActive ? C.text : C.textMuted, fontSize: 13, fontWeight: isActive ? 600 : 400, marginBottom: 1, textAlign: "left", transition: "all 0.15s" }}
                  onMouseEnter={e => !isActive && (e.currentTarget.style.background = C.white10)}
                  onMouseLeave={e => !isActive && (e.currentTarget.style.background = "transparent")}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: cl.color, flexShrink: 0 }} />
                  <Svg d={["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2", "M9 7a4 4 0 100 8 4 4 0 000-8z"]} size={13} stroke={C.textDim} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cl.name}</span>
                </button>
              );
            })}
          </>
        )}
      </div>

      <div style={{ padding: "10px 12px", borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
        <InitialsAvatar name={user?.full_name || "?"} size={30} bg={C.purple} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{user?.full_name || "User"}</div>
          <div style={{ fontSize: 11, color: C.green }}>Online</div>
        </div>
        <button onClick={() => onNav("settings")} style={{ color: C.textMuted, padding: 3, borderRadius: 5 }}>
          <Svg d={["M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z", "M12 12m-3 0a3 3 0 106 0 3 3 0 00-6 0"]} size={16} stroke={C.textMuted} />
        </button>
      </div>
    </div>
  );
}

/* ─── HEADER ──────────────────────────────────────────────────────────────────── */
function Header({ title, subtitle, right }) {
  return (
    <div style={{ padding: "16px 24px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", background: C.bg, flexShrink: 0 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13, color: C.textMuted, marginTop: 3 }}>{subtitle}</p>}
      </div>
      {right && <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{right}</div>}
    </div>
  );
}

/* ─── LOGIN ───────────────────────────────────────────────────────────────────── */
function Field({ label, placeholder, value, onChange, type = "text", Icon }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: C.text, display: "block", marginBottom: 7 }}>{label}</label>
      <div style={{ position: "relative" }}>
        {Icon && <div style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><Icon /></div>}
        <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
          style={{ width: "100%", background: C.bg, border: `1px solid ${C.borderLight}`, borderRadius: 8, padding: Icon ? "11px 14px 11px 40px" : "11px 14px", color: C.text, fontSize: 14, transition: "border 0.15s" }}
          onFocus={e => e.currentTarget.style.borderColor = C.purple}
          onBlur={e => e.currentTarget.style.borderColor = C.borderLight} />
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    if (mode === "register" && pw !== pw2) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login"
        ? { email, password: pw }
        : { full_name: name, email, password: pw };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong"); setLoading(false); return; }
      localStorage.setItem("token", data.token);
      onLogin(data.user);
    } catch {
      setError("Network error. Is the backend running?");
    }
    setLoading(false);
  };


  const LeftPanel = () => (
    <div style={{ flex: 1, background: "linear-gradient(160deg, #1a1040 0%, #0d1230 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, gap: 28 }}>
      <div style={{ width: 72, height: 72, borderRadius: 20, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Svg d={["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2", "M9 7a4 4 0 100 8 4 4 0 000-8z", "M23 21v-2a4 4 0 00-3-3.87", "M16 3.13a4 4 0 010 7.75"]} size={34} stroke="white" sw={1.5} />
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: C.text, marginBottom: 8 }}>Welcome to UniVerse</div>
        <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.7, maxWidth: 260 }}>Connect with students, collaborate on projects, and build your university community.</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", maxWidth: 300 }}>
        {["Connect with peers|Find and collaborate with students in your courses", "Join study groups|Participate in discussions and group projects", "Stay organized|Keep track of assignments and deadlines"].map(item => {
          const [title, desc] = item.split("|");
          return (
            <div key={title} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: C.purpleBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                <Svg d="M20 6L9 17l-5-5" size={13} stroke={C.purpleLight} sw={2.5} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{title}</div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (mode === "role") return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="fade-up" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 40, width: "100%", maxWidth: 700 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Svg d={["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2", "M9 7a4 4 0 100 8 4 4 0 000-8z", "M23 21v-2a4 4 0 00-3-3.87", "M16 3.13a4 4 0 010 7.75"]} size={28} stroke="white" sw={1.5} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 6 }}>Choose Your Role</h2>
          <p style={{ fontSize: 13, color: C.textMuted }}>Select how you'd like to use UniVerse. You can always change this later in your settings.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
          {[
            { id: "student", label: "Student", desc: "Access courses, join study groups, and connect with classmates", bg: "#2563eb", icon: "M22 10v6M2 10l10-5 10 5-10 5z M6 12v5c3 3 9 3 12 0v-5" },
            { id: "instructor", label: "Instructor", desc: "Manage courses, grade assignments, and interact with students", bg: "#16a34a", icon: "M4 19.5A2.5 2.5 0 016.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" },
            { id: "student", label: "Club Member", desc: "Join clubs, participate in events, and build communities", bg: C.purple, icon: ["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2", "M9 7a4 4 0 100 8 4 4 0 000-8z"] },
            { id: "student", label: "Student & Club", desc: "Get the full UniVerse experience with all features", bg: C.purple, icon: ["M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"] },
          ].map((r, i) => (
            <button key={i} onClick={() => onLogin(r.id)}
              style={{ padding: "22px 16px", borderRadius: 12, border: `1px solid ${C.borderLight}`, background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.purple; e.currentTarget.style.background = C.purpleBg2; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.borderLight; e.currentTarget.style.background = "transparent"; }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: r.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Svg d={r.icon} size={26} stroke="white" sw={1.5} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 4 }}>{r.label}</div>
                <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>{r.desc}</div>
              </div>
            </button>
          ))}
        </div>
        <button onClick={() => onLogin("student")} style={{ width: "100%", background: C.white10, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 0", color: C.textMuted, fontSize: 14, fontWeight: 500, marginBottom: 10 }}>Continue to UniVerse</button>
        <div style={{ textAlign: "center" }}><button onClick={() => onLogin("student")} style={{ color: C.textMuted, fontSize: 13, fontWeight: 600 }}>I'll decide later</button></div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="fade-up" style={{ display: "flex", borderRadius: 16, overflow: "hidden", width: "100%", maxWidth: 860, border: `1px solid ${C.border}`, minHeight: 480 }}>
        <LeftPanel />
        <div style={{ width: 420, background: C.card, padding: "40px 36px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 4 }}>{mode === "login" ? "Sign in to UniVerse" : "Join UniVerse"}</h2>
          <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 28 }}>{mode === "login" ? "Welcome back! Enter your credentials" : "Create your account to get started"}</p>

          {mode === "register" && <Field label="Full Name" placeholder="John Doe" value={name} onChange={setName} Icon={() => <Svg d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z" size={16} stroke={C.textMuted} />} />}
          <Field label="Email" placeholder="student@university.edu" value={email} onChange={setEmail} type="email" Icon={() => <Svg d={["M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z", "M22 6l-10 7L2 6"]} size={16} stroke={C.textMuted} />} />
          <Field label="Password" placeholder="••••••••" value={pw} onChange={setPw} type="password" Icon={() => <Svg d={["M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z", "M7 11V7a5 5 0 0110 0v4"]} size={16} stroke={C.textMuted} />} />
          {mode === "register" && <Field label="Confirm Password" placeholder="••••••••" value={pw2} onChange={setPw2} type="password" Icon={() => <Svg d={["M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z", "M7 11V7a5 5 0 0110 0v4"]} size={16} stroke={C.textMuted} />} />}

          {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 12, padding: "9px 12px", background: C.redBg, borderRadius: 7 }}>{error}</div>}
          <button onClick={submit} disabled={loading}
            style={{ width: "100%", background: C.purple, color: "white", borderRadius: 8, padding: "12px 0", fontSize: 15, fontWeight: 700, marginTop: 4, marginBottom: 16, opacity: loading ? 0.7 : 1 }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = "0.9"; }} onMouseLeave={e => { if (!loading) e.currentTarget.style.opacity = "1"; }}>
            {loading ? "Please wait…" : (mode === "login" ? "Sign In" : "Create Account")}
          </button>

          {mode === "register" && <p style={{ fontSize: 12, color: C.textMuted, textAlign: "center", marginBottom: 14, lineHeight: 1.5 }}>By creating an account, you agree to our <span style={{ color: C.purpleLight }}>Terms of Service</span> and <span style={{ color: C.purpleLight }}>Privacy Policy</span></p>}

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ fontSize: 12, color: C.textMuted }}>or</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>
          <p style={{ textAlign: "center", fontSize: 13, color: C.textMuted }}>
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => setMode(mode === "login" ? "register" : "login")} style={{ color: C.purpleLight, fontWeight: 600, fontSize: 13 }}>
              {mode === "login" ? "Create account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── TASKS ────────────────────────────────────────────────────────────────────── */
function TasksView() {
  const user  = useContext(UserContext);
  const isStudent = user?.role === "student";
  const toast = useToast();
  const [tasks, setTasks]       = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [newDue, setNewDue]     = useState("");
  const [newCourse, setNewCourse] = useState("");
  const [myCourses, setMyCourses] = useState([]);
  const [adding, setAdding]     = useState(false);
  const [filter, setFilter]     = useState("pending");

  useEffect(() => {
    api("/api/tasks").then(d => { if (Array.isArray(d)) setTasks(d); }).catch(() => {});
    if (!isStudent) api("/api/courses").then(d => { if (Array.isArray(d)) setMyCourses(d); }).catch(() => {});
  }, []);

  const addTask = async () => {
    if (!newTitle.trim()) return;
    try {
      const res = await api("/api/tasks", { method: "POST", body: { title: newTitle, due_date: newDue || undefined, course_id: newCourse || undefined } });
      if (res.id) { setTasks(p => [res, ...p]); setNewTitle(""); setNewDue(""); setNewCourse(""); setAdding(false); }
    } catch { toast("Failed to add task", "error"); }
  };

  const toggle = async (id) => {
    try {
      const res = await api(`/api/tasks/${id}/toggle`, { method: "PATCH" });
      if (res.id) setTasks(p => p.map(t => t.id === id ? { ...t, is_done: res.is_done } : t));
    } catch { toast("Failed to update task", "error"); }
  };

  const remove = async (id) => {
    try {
      await api(`/api/tasks/${id}`, { method: "DELETE" });
      setTasks(p => p.filter(t => t.id !== id));
    } catch { toast("Failed to delete task", "error"); }
  };

  const shown  = tasks.filter(t => filter === "all" ? true : filter === "done" ? t.is_done : !t.is_done);
  const overdue = (t) => t.due_date && !t.is_done && new Date(t.due_date) < new Date();

  return (
    <div className="fade-up" style={{ padding: 20, maxWidth: 700 }}>
      {isStudent && (
        <div style={{ background: C.blueBg, border: `1px solid ${C.blue}33`, borderRadius: 10, padding: "10px 16px", marginBottom: 14, fontSize: 13, color: C.textMuted, display: "flex", alignItems: "center", gap: 8 }}>
          <Svg d="M13 16h-1v-4h-1m1-4h.01" size={15} stroke={C.blue} />
          Tasks are assigned by your instructors. Complete them before the due date.
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {[["pending", "Pending"], ["done", "Completed"], ["all", "All"]].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)} style={{ padding: "6px 16px", borderRadius: 8, fontSize: 13, fontWeight: filter === v ? 600 : 400, background: filter === v ? C.purpleBg : C.card, color: filter === v ? C.purpleLight : C.textMuted, border: `1px solid ${filter === v ? C.purpleLight : C.border}` }}>{l}</button>
          ))}
        </div>
        {!isStudent && (
          <button onClick={() => setAdding(p => !p)} style={{ background: C.purple, color: "white", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            <Svg d="M12 5v14M5 12h14" size={14} stroke="white" /> Assign Task
          </button>
        )}
      </div>

      {!isStudent && adding && (
        <div style={{ background: C.card, border: `1px solid ${C.purpleLight}`, borderRadius: 10, padding: 16, marginBottom: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && addTask()} placeholder="Task title…" autoFocus style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: "9px 12px", color: C.text, fontSize: 14 }} />
          <select value={newCourse} onChange={e => setNewCourse(e.target.value)} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 12px", color: newCourse ? C.text : C.textMuted, fontSize: 13 }}>
            <option value="">Assign to course (optional)</option>
            {myCourses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
          </select>
          <div style={{ display: "flex", gap: 10 }}>
            <input type="date" value={newDue} onChange={e => setNewDue(e.target.value)} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 12px", color: C.text, fontSize: 13, flex: 1 }} />
            <button onClick={addTask} style={{ background: C.purple, color: "white", borderRadius: 7, padding: "7px 20px", fontSize: 13, fontWeight: 600 }}>Save</button>
            <button onClick={() => { setAdding(false); setNewTitle(""); setNewDue(""); setNewCourse(""); }} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 16px", fontSize: 13, color: C.textMuted }}>Cancel</button>
          </div>
        </div>
      )}

      {shown.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: C.textMuted, fontSize: 13 }}>
          {isStudent ? "No tasks assigned by your instructors yet." : `No ${filter === "done" ? "completed" : filter === "pending" ? "pending" : ""} tasks.`}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {shown.map(t => (
          <div key={t.id} style={{ background: C.card, border: `1px solid ${overdue(t) ? C.orange + "66" : C.border}`, borderRadius: 10, padding: "13px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            {!isStudent && (
              <button onClick={() => toggle(t.id)} style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${t.is_done ? C.purple : C.borderLight}`, background: t.is_done ? C.purple : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                {t.is_done && <Svg d="M20 6L9 17l-5-5" size={11} stroke="white" sw={2.5} />}
              </button>
            )}
            {isStudent && (
              <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${t.is_done ? C.green : C.borderLight}`, background: t.is_done ? C.greenBg : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {t.is_done && <Svg d="M20 6L9 17l-5-5" size={11} stroke={C.green} sw={2.5} />}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: t.is_done ? C.textMuted : C.text, textDecoration: t.is_done ? "line-through" : "none" }}>{t.title}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 3 }}>
                {t.due_date && (
                  <div style={{ fontSize: 11, color: overdue(t) ? C.orange : C.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
                    <Svg d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2" size={10} stroke={overdue(t) ? C.orange : C.textMuted} />
                    {overdue(t) ? "Overdue · " : "Due "}{new Date(t.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                )}
                {t.course_code && <div style={{ fontSize: 11, color: C.textMuted }}>{t.course_code}</div>}
                {isStudent && t.assigned_by && <div style={{ fontSize: 11, color: C.textMuted }}>by {t.assigned_by}</div>}
              </div>
            </div>
            {!isStudent && (
              <button onClick={() => remove(t.id)} style={{ color: C.textMuted, padding: 6, borderRadius: 6, opacity: 0.6 }} onMouseEnter={e => e.currentTarget.style.color = C.red} onMouseLeave={e => e.currentTarget.style.color = C.textMuted}>
                <Svg d={["M3 6h18", "M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"]} size={15} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── HOME ────────────────────────────────────────────────────────────────────── */
function HomeDashboard({ onNav }) {
  const toast = useToast();
  const [tasks, setTasks] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [activity, setActivity] = useState([]);
  const [stats, setStats] = useState({ active_courses: 0, pending_tasks: 0, events_this_week: 0, unread_messages: 0 });

  useEffect(() => {
    api("/api/tasks").then(d => { if (Array.isArray(d)) setTasks(d.slice(0, 3).map(t => ({ id: t.id, text: t.title, due: t.due_date ? `Due ${new Date(t.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "No due date", dueColor: t.due_date && new Date(t.due_date) < new Date(Date.now() + 86400000 * 2) ? C.orange : C.textMuted, done: t.is_done }))); }).catch(() => {});
    api("/api/announcements").then(d => { if (Array.isArray(d)) setAnnouncements(d.slice(0, 3)); }).catch(() => {});
    api("/api/events").then(d => { if (Array.isArray(d)) setEvents(d.slice(0, 3)); }).catch(() => {});
    api("/api/users/activity").then(d => { if (Array.isArray(d)) setActivity(d.slice(0, 3)); }).catch(() => {});
    api("/api/users/home-summary").then(d => { if (d && !d.error) setStats(d); }).catch(() => {});
  }, []);

  const toggleTask = (id) => {
    api(`/api/tasks/${id}/toggle`, { method: "PATCH" }).then(() => setTasks(p => p.map(t => t.id === id ? { ...t, done: !t.done } : t))).catch(() => toast("Failed to update task", "error"));
  };

  return (
    <div className="fade-up" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
      {/* AI Banner */}
      <div style={{ background: "linear-gradient(135deg,#1a1040,#1e1535)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: C.purpleBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Svg d={["M12 8V4H8", "M3 8h18v11a2 2 0 01-2 2H5a2 2 0 01-2-2z", "M9 13h.01M15 13h.01"]} size={22} stroke={C.purpleLight} sw={1.8} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>AI Study Assistant</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>Get help with homework, study plans, and course questions</div>
        </div>
        <button onClick={() => onNav("ai")} style={{ background: C.purple, color: "white", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>Ask AI</button>
      </div>

      {/* 3-col grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        {/* Announcements */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Svg d={["M22 17H2a3 3 0 000 6h1", "M18 9a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9", "M13.73 21a2 2 0 01-3.46 0"]} size={15} stroke={C.textMuted} /><span style={{ fontWeight: 600, fontSize: 13 }}>Announcements</span></div>
            <span style={{ fontSize: 12, color: C.textMuted, background: C.white10, borderRadius: 20, padding: "1px 8px" }}>3</span>
          </div>
          {announcements.length === 0 && <div style={{ fontSize: 12, color: C.textMuted, padding: "8px 0" }}>No announcements yet.</div>}
          {announcements.map((a, i) => (
            <div key={a.id} style={{ padding: "9px 0", borderBottom: i < announcements.length - 1 ? `1px solid ${C.border}` : "none", display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.purple, flexShrink: 0, marginTop: 5 }} />
              <div><div style={{ fontSize: 13, fontWeight: 500 }}>{a.title}</div><div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{new Date(a.created_at).toLocaleDateString()}</div></div>
            </div>
          ))}
        </div>

        {/* Tasks */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Svg d="M9 11l3 3L22 4 M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" size={15} stroke={C.textMuted} /><span style={{ fontWeight: 600, fontSize: 13 }}>Tasks</span></div>
            <span style={{ fontSize: 12, color: C.textMuted, background: C.white10, borderRadius: 20, padding: "1px 8px" }}>3</span>
          </div>
          {tasks.length === 0 && <div style={{ fontSize: 12, color: C.textMuted, padding: "8px 0" }}>No pending tasks.</div>}
          {tasks.map((t, i) => (
            <div key={t.id} style={{ padding: "9px 0", borderBottom: i < tasks.length - 1 ? `1px solid ${C.border}` : "none", display: "flex", alignItems: "flex-start", gap: 10 }}>
              <button onClick={() => toggleTask(t.id)}
                style={{ width: 16, height: 16, borderRadius: 3, border: `2px solid ${t.done ? C.purple : C.borderLight}`, background: t.done ? C.purple : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2, transition: "all 0.15s" }}>
                {t.done && <Svg d="M20 6L9 17l-5-5" size={10} stroke="white" sw={2.5} />}
              </button>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: t.done ? C.textMuted : C.text, textDecoration: t.done ? "line-through" : "none" }}>{t.text}</div>
                <div style={{ fontSize: 11, color: t.dueColor, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                  <Svg d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2" size={10} stroke={t.dueColor} />{t.due}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Events */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Svg d={["M3 4h18v18H3z", "M16 2v4M8 2v4", "M3 10h18"]} size={15} stroke={C.textMuted} /><span style={{ fontWeight: 600, fontSize: 13 }}>Upcoming Events</span></div>
            <span style={{ fontSize: 12, color: C.textMuted, background: C.white10, borderRadius: 20, padding: "1px 8px" }}>3</span>
          </div>
          {events.length === 0 && <div style={{ fontSize: 12, color: C.textMuted, padding: "8px 0" }}>No upcoming events.</div>}
          {events.map((ev, i) => (
            <div key={ev.id} style={{ padding: "9px 0", borderBottom: i < events.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{ev.title}</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                <Svg d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2" size={10} stroke={C.textMuted} />{new Date(ev.start_time).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Svg d="M22 12h-4l-3 9L9 3l-3 9H2" size={15} stroke={C.textMuted} /><span style={{ fontWeight: 600, fontSize: 13 }}>Recent Activity</span></div>
          <button onClick={() => onNav("announcements")} style={{ fontSize: 12, color: C.purpleLight, fontWeight: 500 }}>View All</button>
        </div>
        {activity.length === 0 && <div style={{ fontSize: 12, color: C.textMuted }}>No recent activity.</div>}
        {activity.map((a, i) => (
          <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: i < activity.length - 1 ? `1px solid ${C.border}` : "none" }}>
            <InitialsAvatar name={a.actor_name} size={34} bg={getColor(a.actor_name)} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13 }}><span style={{ color: C.purpleLight, fontWeight: 600 }}>{a.actor_name}</span>{" "}{a.action}{a.context ? <>{" "}<span style={{ color: C.purpleLight, fontWeight: 600 }}>{a.context}</span></> : ""}</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{new Date(a.created_at).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14 }}>
        {[{ label: "Active Courses", value: stats.active_courses, icon: "M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z", color: C.blue, bg: C.blueBg },
        { label: "Pending Tasks", value: stats.pending_tasks, icon: "M9 11l3 3L22 4 M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11", color: C.purple, bg: C.purpleBg },
        { label: "Events This Week", value: stats.events_this_week, icon: ["M3 4h18v18H3z", "M16 2v4M8 2v4", "M3 10h18"], color: C.green, bg: C.greenBg },
        { label: "Unread Messages", value: stats.unread_messages, icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z", color: C.orange, bg: C.orangeBg }].map(s => (
          <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div><div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6 }}>{s.label}</div><div style={{ fontSize: 26, fontWeight: 800 }}>{s.value}</div></div>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><Svg d={s.icon} size={21} stroke={s.color} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── CALENDAR ────────────────────────────────────────────────────────────────── */
const EVENT_TYPE_COLOR = { lecture: C.blue, meeting: C.purple, exam: C.red, deadline: C.orange, club_event: C.green, office_hours: C.cyan };
const EVENT_TYPE_LABEL = { lecture: "Lecture", meeting: "Meeting", exam: "Exam", deadline: "Deadline", club_event: "Club Event", office_hours: "Office Hours" };

function CalendarView({ triggerCreate = 0 }) {
  const user    = useContext(UserContext);
  const canEdit = user?.role === "instructor" || user?.role === "admin";
  const toast   = useToast();

  const [view, setView] = useState("upcoming");

  // Week state
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d;
  });
  const [weekEvents, setWeekEvents] = useState([]);

  // Month state
  const [monthDate, setMonthDate] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; });
  const [monthEvents, setMonthEvents] = useState([]);

  // Upcoming list state
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [upLoading, setUpLoading] = useState(false);

  // Create event form
  const [creating,   setCreating]   = useState(false);
  const [evTitle,    setEvTitle]    = useState("");
  const [evType,     setEvType]     = useState("lecture");
  const [evDate,     setEvDate]     = useState("");
  const [evTime,     setEvTime]     = useState("09:00");
  const [evDuration, setEvDuration] = useState(60);
  const [evSaving,   setEvSaving]   = useState(false);

  const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const today = new Date(); today.setHours(0,0,0,0);

  // ── Load week events ──────────────────────────────────────────────────
  useEffect(() => {
    if (view !== "week") return;
    const to = new Date(weekStart); to.setDate(to.getDate() + 7);
    api(`/api/events?from=${weekStart.toISOString()}&to=${to.toISOString()}`)
      .then(d => { if (Array.isArray(d)) setWeekEvents(d); }).catch(() => {});
  }, [weekStart, view]);

  // ── Load month events ─────────────────────────────────────────────────
  useEffect(() => {
    if (view !== "month") return;
    const from = new Date(monthDate); from.setDate(1);
    const to   = new Date(monthDate); to.setMonth(to.getMonth() + 1); to.setDate(0); to.setHours(23,59,59);
    api(`/api/events?from=${from.toISOString()}&to=${to.toISOString()}`)
      .then(d => { if (Array.isArray(d)) setMonthEvents(d); }).catch(() => {});
  }, [monthDate, view]);

  // ── Load upcoming events (120-day window) ─────────────────────────────
  const loadUpcoming = () => {
    setUpLoading(true);
    const from = new Date(); from.setDate(from.getDate() - 1);
    const to   = new Date(); to.setDate(to.getDate() + 120);
    api(`/api/events?from=${from.toISOString()}&to=${to.toISOString()}`)
      .then(d => { if (Array.isArray(d)) setUpcomingEvents(d); })
      .catch(() => {})
      .finally(() => setUpLoading(false));
  };
  useEffect(() => { if (view === "upcoming") loadUpcoming(); }, [view]);

  useEffect(() => { if (triggerCreate > 0 && canEdit) setCreating(true); }, [triggerCreate]);

  // ── Create event ──────────────────────────────────────────────────────
  const createEvent = async () => {
    if (!evTitle.trim() || !evDate) { toast("Title and date are required", "error"); return; }
    setEvSaving(true);
    try {
      const start = new Date(`${evDate}T${evTime}:00`);
      const end   = new Date(start.getTime() + evDuration * 60000);
      const res   = await api("/api/events", { method: "POST", body: { title: evTitle, type: evType, start_time: start.toISOString(), end_time: end.toISOString() } });
      if (res.error) { toast(res.error, "error"); setEvSaving(false); return; }
      toast(`"${evTitle}" added!`, "success");
      setCreating(false); setEvTitle(""); setEvType("lecture"); setEvDate(""); setEvTime("09:00"); setEvDuration(60);
      if (view === "upcoming") loadUpcoming();
      else if (view === "week") {
        const to = new Date(weekStart); to.setDate(to.getDate() + 7);
        api(`/api/events?from=${weekStart.toISOString()}&to=${to.toISOString()}`).then(d => { if (Array.isArray(d)) setWeekEvents(d); }).catch(() => {});
      }
    } catch { toast("Failed to create event", "error"); }
    setEvSaving(false);
  };

  // ── Month grid helpers ────────────────────────────────────────────────
  const monthDays = () => {
    const y = monthDate.getFullYear(), m = monthDate.getMonth();
    const first = new Date(y, m, 1), last = new Date(y, m + 1, 0);
    const days = [];
    for (let i = first.getDay() - 1; i >= 0; i--) { const d = new Date(first); d.setDate(d.getDate() - i - 1); days.push({ date: d, in: false }); }
    for (let i = 1; i <= last.getDate(); i++) days.push({ date: new Date(y, m, i), in: true });
    const rem = 7 - (days.length % 7); if (rem < 7) for (let i = 1; i <= rem; i++) { const d = new Date(last); d.setDate(d.getDate() + i); days.push({ date: d, in: false }); }
    return days;
  };
  const evForDay = (arr, date) => arr.filter(ev => new Date(ev.start_time).toDateString() === date.toDateString());
  const prevMonth = () => { const d = new Date(monthDate); d.setMonth(d.getMonth() - 1); setMonthDate(d); };
  const nextMonth = () => { const d = new Date(monthDate); d.setMonth(d.getMonth() + 1); setMonthDate(d); };
  const prevWeek  = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); };
  const nextWeek  = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); };
  const goToday   = () => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); setWeekStart(d);
    const m = new Date(); m.setDate(1); m.setHours(0,0,0,0); setMonthDate(m);
  };

  // ── Group upcoming events by date label ───────────────────────────────
  const groupedUpcoming = () => {
    const groups = {};
    const nowMs = new Date().setHours(0,0,0,0);
    upcomingEvents.forEach(ev => {
      const d = new Date(ev.start_time); d.setHours(0,0,0,0);
      const diff = Math.round((d.getTime() - nowMs) / 86400000);
      const label = diff < 0 ? "Yesterday" : diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" });
      if (!groups[label]) groups[label] = [];
      groups[label].push(ev);
    });
    return groups;
  };

  // ── Shared create-event modal ─────────────────────────────────────────
  const CreateModal = () => creating ? (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="fade-up" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 460 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Add Calendar Event</div>
          <button onClick={() => setCreating(false)} style={{ color: C.textMuted, padding: 4 }}><Svg d={["M18 6L6 18","M6 6l12 12"]} size={18} /></button>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 5 }}>Title *</label>
          <input value={evTitle} onChange={e => setEvTitle(e.target.value)} placeholder="e.g. CS101 Lecture" autoFocus
            style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13 }}
            onFocus={e => e.target.style.borderColor = C.purple} onBlur={e => e.target.style.borderColor = C.border} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 5 }}>Type</label>
            <select value={evType} onChange={e => setEvType(e.target.value)} style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13 }}>
              {["lecture","meeting","exam","deadline","club_event","office_hours"].map(t => <option key={t} value={t}>{t.replace(/_/g," ")}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 5 }}>Duration (min)</label>
            <select value={evDuration} onChange={e => setEvDuration(+e.target.value)} style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13 }}>
              {[30,60,90,120,180].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 22 }}>
          <div>
            <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 5 }}>Date *</label>
            <input type="date" value={evDate} onChange={e => setEvDate(e.target.value)}
              style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13 }}
              onFocus={e => e.target.style.borderColor = C.purple} onBlur={e => e.target.style.borderColor = C.border} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 5 }}>Time</label>
            <input type="time" value={evTime} onChange={e => setEvTime(e.target.value)}
              style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13 }}
              onFocus={e => e.target.style.borderColor = C.purple} onBlur={e => e.target.style.borderColor = C.border} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setCreating(false)} style={{ flex: 1, background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 0", fontSize: 13, fontWeight: 600, color: C.textMuted }}>Cancel</button>
          <button onClick={createEvent} disabled={evSaving} style={{ flex: 2, background: C.purple, color: "white", borderRadius: 8, padding: "10px 0", fontSize: 13, fontWeight: 700, opacity: evSaving ? 0.7 : 1 }}>{evSaving ? "Saving…" : "Add Event"}</button>
        </div>
      </div>
    </div>
  ) : null;

  // ── Shared toolbar ────────────────────────────────────────────────────
  const Toolbar = () => (
    <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
      {[["upcoming","Upcoming"],["month","Month"],["week","Week"]].map(([v,l]) => (
        <button key={v} onClick={() => setView(v)}
          style={{ padding: "6px 14px", borderRadius: 7, background: view === v ? C.purple : "transparent", color: view === v ? "white" : C.textMuted, fontSize: 13, fontWeight: 500, border: `1px solid ${view === v ? C.purple : C.border}`, transition: "all 0.15s" }}>{l}</button>
      ))}
      <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {Object.entries(EVENT_TYPE_LABEL).map(([k, l]) => {
          const col = EVENT_TYPE_COLOR[k];
          return <span key={k} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, border: `1px solid ${col}66`, color: col, fontWeight: 600 }}>{l}</span>;
        })}
      </div>
    </div>
  );

  // ── UPCOMING LIST VIEW ────────────────────────────────────────────────
  if (view === "upcoming") {
    const groups = groupedUpcoming();
    const keys   = Object.keys(groups);
    return (
      <div className="fade-up" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 65px)", overflow: "hidden" }}>
        <CreateModal />
        <Toolbar />
        <div style={{ padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ fontSize: 13, color: C.textMuted }}>{upcomingEvents.length} events in the next 120 days</div>
          {canEdit && <button onClick={() => setCreating(true)} style={{ background: C.purple, color: "white", borderRadius: 7, padding: "6px 14px", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}><Svg d="M12 5v14M5 12h14" size={12} stroke="white" />Add Event</button>}
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {upLoading ? (
            <div style={{ textAlign: "center", padding: 60, color: C.textMuted, fontSize: 13 }}>Loading events…</div>
          ) : keys.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: C.textMuted, fontSize: 13 }}>No upcoming events found.</div>
          ) : keys.map(label => (
            <div key={label} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: label === "Today" ? C.purpleLight : C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                {label === "Today" && <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.purple, display: "inline-block" }} />}
                {label}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {groups[label].map(ev => {
                  const col   = EVENT_TYPE_COLOR[ev.type] || C.blue;
                  const start = new Date(ev.start_time);
                  const end   = ev.end_time ? new Date(ev.end_time) : null;
                  const fmtT  = d => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
                  const isPast = start < new Date();
                  return (
                    <div key={ev.id} style={{ display: "flex", gap: 12, padding: "12px 16px", background: C.card, border: `1px solid ${C.border}`, borderLeft: `4px solid ${col}`, borderRadius: 10, opacity: isPast ? 0.55 : 1, transition: "opacity 0.15s" }}>
                      <div style={{ minWidth: 52, textAlign: "center" }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: col, lineHeight: 1 }}>{start.getDate()}</div>
                        <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 600, textTransform: "uppercase" }}>{start.toLocaleString("en-US",{month:"short"})}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</div>
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3, display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <span>{fmtT(start)}{end ? ` – ${fmtT(end)}` : ""}</span>
                          {ev.course_name && <span>{ev.course_code}</span>}
                          {ev.club_name   && <span>{ev.club_name}</span>}
                        </div>
                      </div>
                      <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 20, background: col + "22", color: col, fontWeight: 700, height: "fit-content", whiteSpace: "nowrap" }}>
                        {EVENT_TYPE_LABEL[ev.type] || ev.type}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── MONTH VIEW ────────────────────────────────────────────────────────
  if (view === "month") {
    const days = monthDays();
    const monthLabel = monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    return (
      <div className="fade-up" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 65px)", overflow: "hidden" }}>
        <CreateModal />
        <Toolbar />
        <div style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <button onClick={prevMonth} style={{ color: C.textMuted, padding: 4, borderRadius: 6, border: `1px solid ${C.border}` }}><Svg d="M15 18l-6-6 6-6" size={16} /></button>
          <span style={{ fontWeight: 700, fontSize: 15, minWidth: 160, textAlign: "center" }}>{monthLabel}</span>
          <button onClick={nextMonth} style={{ color: C.textMuted, padding: 4, borderRadius: 6, border: `1px solid ${C.border}` }}><Svg d="M9 18l6-6-6-6" size={16} /></button>
          <button onClick={goToday} style={{ marginLeft: 8, padding: "5px 14px", borderRadius: 7, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, fontWeight: 500 }}>Today</button>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {canEdit && <button onClick={() => setCreating(true)} style={{ background: C.purple, color: "white", borderRadius: 7, padding: "5px 14px", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}><Svg d="M12 5v14M5 12h14" size={12} stroke="white" />Add Event</button>}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* Day-of-week headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: `1px solid ${C.border}`, background: C.sidebar }}>
            {DAYS.map(d => <div key={d} style={{ padding: "8px 0", textAlign: "center", fontSize: 11, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{d}</div>)}
          </div>
          {/* Calendar grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gridAutoRows: "minmax(90px,1fr)" }}>
            {days.map(({ date, in: inMonth }, idx) => {
              const isToday = date.getTime() === today.getTime();
              const dayEvs  = evForDay(monthEvents, date);
              return (
                <div key={idx} style={{ borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: "6px 8px", background: isToday ? "rgba(124,58,237,0.06)" : "transparent", opacity: inMonth ? 1 : 0.35 }}>
                  <div style={{ fontSize: 13, fontWeight: isToday ? 800 : 500, color: isToday ? C.purpleLight : C.text, width: 26, height: 26, borderRadius: "50%", background: isToday ? C.purpleBg : "transparent", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>{date.getDate()}</div>
                  {dayEvs.slice(0,3).map(ev => {
                    const col = EVENT_TYPE_COLOR[ev.type] || C.blue;
                    return <div key={ev.id} style={{ fontSize: 10, fontWeight: 600, color: col, background: col + "18", borderRadius: 3, padding: "1px 5px", marginBottom: 2, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{ev.title}</div>;
                  })}
                  {dayEvs.length > 3 && <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 600 }}>+{dayEvs.length - 3} more</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── WEEK VIEW ─────────────────────────────────────────────────────────
  const weekDates = DAYS.map((_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; });
  const fmtRange  = () => {
    const end = new Date(weekStart); end.setDate(end.getDate() + 6);
    return `${weekStart.toLocaleDateString("en-US",{month:"short",day:"numeric"})} – ${end.toLocaleDateString("en-US",{month:"short",day:"numeric"})}, ${end.getFullYear()}`;
  };
  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 65px)", overflow: "hidden" }}>
      <CreateModal />
      <Toolbar />
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${C.border}` }}>
          <button onClick={prevWeek} style={{ color: C.textMuted, padding: 4, borderRadius: 6, border: `1px solid ${C.border}` }}><Svg d="M15 18l-6-6 6-6" size={16} /></button>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{fmtRange()}</span>
          <button onClick={nextWeek} style={{ color: C.textMuted, padding: 4, borderRadius: 6, border: `1px solid ${C.border}` }}><Svg d="M9 18l6-6-6-6" size={16} /></button>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={goToday} style={{ padding: "5px 14px", borderRadius: 7, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, fontWeight: 500 }}>Today</button>
            {canEdit && <button onClick={() => setCreating(true)} style={{ background: C.purple, color: "white", borderRadius: 7, padding: "5px 14px", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}><Svg d="M12 5v14M5 12h14" size={12} stroke="white" />Add Event</button>}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "54px repeat(7,1fr)", borderBottom: `1px solid ${C.border}` }}>
          <div />
          {weekDates.map((d, i) => {
            const isToday = d.getTime() === today.getTime();
            return (
              <div key={i} style={{ padding: "8px 0", textAlign: "center", borderLeft: `1px solid ${C.border}`, background: isToday ? "rgba(124,58,237,0.08)" : "transparent" }}>
                <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{DAYS[i]}</div>
                <div style={{ fontSize: 16, fontWeight: isToday ? 800 : 500, color: isToday ? C.purpleLight : C.text, marginTop: 2 }}>{d.getDate()}</div>
              </div>
            );
          })}
        </div>
        {Array.from({ length: 15 }, (_, i) => i + 7).map(h => (
          <div key={h} style={{ display: "grid", gridTemplateColumns: "54px repeat(7,1fr)", minHeight: 56, borderBottom: `1px solid ${C.border}` }}>
            <div style={{ padding: "6px 8px", fontSize: 10, color: C.textDim, textAlign: "right", paddingTop: 8 }}>{String(h).padStart(2,"0")}:00</div>
            {weekDates.map((date, i) => {
              const isToday = date.getTime() === today.getTime();
              const dayEvs  = evForDay(weekEvents, date).filter(ev => new Date(ev.start_time).getHours() === h);
              return (
                <div key={i} style={{ borderLeft: `1px solid ${C.border}`, background: isToday ? "rgba(124,58,237,0.03)" : "transparent", padding: dayEvs.length ? "2px 3px" : 0 }}>
                  {dayEvs.map(ev => {
                    const col = EVENT_TYPE_COLOR[ev.type] || C.blue;
                    return <div key={ev.id} title={ev.title} style={{ background: col + "22", border: `1px solid ${col}44`, borderLeft: `3px solid ${col}`, borderRadius: 4, padding: "2px 5px", fontSize: 10, color: col, fontWeight: 600, marginBottom: 2, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{ev.title}</div>;
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── BADGES ──────────────────────────────────────────────────────────────────── */
const TIER_COLOR = { Gold: C.yellow, Silver: "#94a3b8", Bronze: "#b45309" };
const CAT_COLOR  = { Academic: C.blue, Collaboration: C.purple, Engagement: C.orange, Special: C.cyan };

function BadgesView() {
  const [tab, setTab] = useState("All Badges");
  const [badges, setBadges] = useState([]);
  const [summary, setSummary] = useState({ earned_count: 0, total_xp: 0, level_name: "Beginner" });

  useEffect(() => {
    api("/api/badges").then(d => {
      if (Array.isArray(d)) setBadges(d.map(b => ({
        ...b,
        desc: b.description,
        tierColor: TIER_COLOR[b.tier] || C.yellow,
        bg: CAT_COLOR[b.category] || C.purple,
        gradProg: `linear-gradient(90deg,${CAT_COLOR[b.category] || C.purple},${CAT_COLOR[b.category] || C.purple}88)`,
        progress: b.progress_xp || 0,
        max: b.max_xp,
        locked: !b.earned && (b.progress_xp || 0) === 0,
      })));
    }).catch(() => {});
    api("/api/badges/summary").then(d => { if (d && !d.error) setSummary(d); }).catch(() => {});
  }, []);

  const filtered = tab === "All Badges" ? badges : badges.filter(b => b.category === tab);
  const earned = summary.earned_count;
  return (
    <div className="fade-up" style={{ padding: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        {[{ label: "Total Badges", value: `${earned} / ${badges.length}`, icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z", ib: C.purpleBg, ic: C.purpleLight },
        { label: "Total XP", value: `${summary.total_xp || 0} XP`, icon: "M22 12h-4l-3 9L9 3l-3 9H2", ib: C.blueBg, ic: C.blue },
        { label: "Level", value: summary.level_name || "Beginner", icon: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z", ib: C.greenBg, ic: C.green }].map(s => (
          <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: s.ib, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Svg d={s.icon} size={20} stroke={s.ic} /></div>
            <div><div style={{ fontSize: 11, color: C.textMuted, marginBottom: 3 }}>{s.label}</div><div style={{ fontSize: 17, fontWeight: 700 }}>{s.value}</div></div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {["All Badges", "Academic", "Collaboration", "Engagement", "Special"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "7px 16px", borderRadius: 8, background: tab === t ? C.purpleBg : "transparent", color: tab === t ? C.purpleLight : C.textMuted, border: `1px solid ${tab === t ? C.purpleLight : C.border}`, fontSize: 13, fontWeight: tab === t ? 600 : 400, transition: "all 0.15s" }}>{t}</button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        {filtered.map(b => (
          <div key={b.name} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, opacity: b.locked ? 0.65 : 1, position: "relative" }}>
            {b.earned && <div style={{ position: "absolute", top: 14, right: 14, width: 22, height: 22, borderRadius: "50%", background: C.green, display: "flex", alignItems: "center", justifyContent: "center" }}><Svg d="M20 6L9 17l-5-5" size={12} stroke="white" sw={2.5} /></div>}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
              <div style={{ position: "relative" }}>
                <div style={{ width: 52, height: 52, borderRadius: 12, background: b.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, opacity: b.earned ? 1 : 0.5 }}>{b.icon}</div>
                {!b.earned && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}><Svg d={["M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z", "M7 11V7a5 5 0 0110 0v4"]} size={16} stroke="#aaa" /></div>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: b.earned ? C.text : C.textMuted }}>{b.name}</span>
                  {!b.earned && <span style={{ fontSize: 10, color: C.textDim, background: C.white10, padding: "1px 6px", borderRadius: 4 }}>Locked</span>}
                </div>
                <p style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>{b.desc}</p>
                <span style={{ fontSize: 10, fontWeight: 700, color: b.tierColor, background: b.tierColor + "22", padding: "2px 8px", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 3, marginTop: 6 }}>✦ {b.tier}</span>
              </div>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 5 }}>
                <span style={{ color: C.textMuted }}>Progress</span>
                <span style={{ color: b.progress >= b.max ? b.tierColor : C.textMuted, fontWeight: 600 }}>{b.progress} / {b.max} XP</span>
              </div>
              <div style={{ background: C.border, borderRadius: 99, height: 5, overflow: "hidden" }}>
                <div style={{ width: `${Math.min(100, (b.progress / b.max) * 100)}%`, height: "100%", background: b.gradProg, borderRadius: 99 }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── FIND TEAM ───────────────────────────────────────────────────────────────── */
const TEAM_COLORS = [C.blue, C.purple, C.green, C.orange, C.cyan, C.yellow];
const pickTeamColor = (id) => TEAM_COLORS[id % TEAM_COLORS.length];

function FindTeam({ triggerCreate = 0 }) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("All");
  const [teams, setTeams] = useState([]);
  const [requested, setRequested] = useState([]);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDesc, setNewTeamDesc] = useState("");
  const [newTeamType, setNewTeamType] = useState("Study");
  const [newTeamMax, setNewTeamMax] = useState(5);
  const [newTeamLevel, setNewTeamLevel] = useState("Any");
  const [newTeamCourse, setNewTeamCourse] = useState("");
  const [myCourses, setMyCourses] = useState([]);
  const [teamSaving, setTeamSaving] = useState(false);

  const loadTeams = () => api("/api/teams").then(d => {
    if (Array.isArray(d)) setTeams(d.map(t => ({
      ...t, course: t.course_code || t.course_name || "", courseColor: pickTeamColor(t.id), color: pickTeamColor(t.id),
      members: `${t.member_count || 0}/${t.max_members}`, level: t.level_req || "Any",
      created: t.created_at ? new Date(t.created_at).toLocaleDateString() : "",
      leader: t.leader_name || "", mine: t.is_member || false, requests: parseInt(t.pending_requests) || 0, desc: t.description || "",
    })));
  }).catch(() => {});

  useEffect(() => {
    api("/api/teams").then(d => {
      if (Array.isArray(d)) setTeams(d.map(t => ({
        ...t,
        course: t.course_code || t.course_name || "",
        courseColor: pickTeamColor(t.id),
        color: pickTeamColor(t.id),
        members: `${t.member_count || 0}/${t.max_members}`,
        level: t.level_req || "Any",
        created: t.created_at ? new Date(t.created_at).toLocaleDateString() : "",
        leader: t.leader_name || "",
        mine: t.is_member || false,
        requests: parseInt(t.pending_requests) || 0,
        desc: t.description || "",
      })));
    }).catch(() => {});
  }, []);

  useEffect(() => { api("/api/courses").then(d => { if (Array.isArray(d)) setMyCourses(d); }).catch(() => {}); }, []);
  useEffect(() => { if (triggerCreate > 0) setCreating(true); }, [triggerCreate]);

  const createTeam = async () => {
    if (!newTeamName.trim()) { toast("Team name required", "error"); return; }
    setTeamSaving(true);
    try {
      const res = await api("/api/teams", { method: "POST", body: { name: newTeamName, description: newTeamDesc, type: newTeamType, max_members: newTeamMax, level_req: newTeamLevel !== "Any" ? newTeamLevel : null, course_id: newTeamCourse || null } });
      if (res.error) { toast(res.error, "error"); setTeamSaving(false); return; }
      toast(`Team "${newTeamName}" created!`, "success");
      setCreating(false); setNewTeamName(""); setNewTeamDesc(""); setNewTeamType("Study"); setNewTeamMax(5); setNewTeamLevel("Any"); setNewTeamCourse("");
      loadTeams();
    } catch { toast("Failed to create team", "error"); }
    setTeamSaving(false);
  };

  const myTeamCount = teams.filter(t => t.mine).length;

  const filtered = teams.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.name.toLowerCase().includes(q) || t.course.toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (activeTab === "Mine") return t.mine;
    if (activeTab === "Available") return !t.mine && !requested.includes(t.id);
    return true;
  });

  const requestJoin = async (t) => {
    if (requested.includes(t.id)) return;
    try {
      const res = await api(`/api/teams/${t.id}/request`, { method: "POST" });
      if (res.error) { toast(res.error, "error"); return; }
      setRequested(p => [...p, t.id]);
      toast(`Request sent to join "${t.name}"!`, "success");
    } catch { toast("Failed to send request", "error"); }
  };

  return (
    <div className="fade-up" style={{ padding: 20 }}>
      {creating && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="fade-up" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 480 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Create Team</div>
              <button onClick={() => setCreating(false)} style={{ color: C.textMuted, padding: 4 }}><Svg d={["M18 6L6 18","M6 6l12 12"]} size={18} /></button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 5 }}>Team Name *</label>
              <input value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="e.g. Study Wizards" autoFocus
                style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13 }}
                onFocus={e => e.target.style.borderColor = C.purple} onBlur={e => e.target.style.borderColor = C.border} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 5 }}>Description</label>
              <textarea value={newTeamDesc} onChange={e => setNewTeamDesc(e.target.value)} placeholder="What is this team about?" rows={2}
                style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13, resize: "vertical", fontFamily: "inherit" }}
                onFocus={e => e.target.style.borderColor = C.purple} onBlur={e => e.target.style.borderColor = C.border} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 5 }}>Type</label>
                <select value={newTeamType} onChange={e => setNewTeamType(e.target.value)} style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13 }}>
                  {["Study","Project","Competition","Research","Other"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 5 }}>Max Members</label>
                <select value={newTeamMax} onChange={e => setNewTeamMax(+e.target.value)} style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13 }}>
                  {[2,3,4,5,6,8,10].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 22 }}>
              <div>
                <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 5 }}>Course (optional)</label>
                <select value={newTeamCourse} onChange={e => setNewTeamCourse(e.target.value)} style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13 }}>
                  <option value="">No specific course</option>
                  {myCourses.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 5 }}>Skill Level</label>
                <select value={newTeamLevel} onChange={e => setNewTeamLevel(e.target.value)} style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13 }}>
                  {["Any","Beginner","Intermediate","Advanced"].map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setCreating(false)} style={{ flex: 1, background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 0", fontSize: 13, fontWeight: 600, color: C.textMuted }}>Cancel</button>
              <button onClick={createTeam} disabled={teamSaving} style={{ flex: 2, background: C.purple, color: "white", borderRadius: 8, padding: "10px 0", fontSize: 13, fontWeight: 700, opacity: teamSaving ? 0.7 : 1 }}>{teamSaving ? "Creating…" : "Create Team"}</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Svg d="M11 17.25a6.25 6.25 0 110-12.5 6.25 6.25 0 010 12.5z M16 16l4.5 4.5" size={15} stroke={C.textDim} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search teams by name or course..." style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px 10px 36px", color: C.text, fontSize: 13 }} />
        </div>
        {[["All", "All Teams"], ["Mine", `My Teams (${myTeamCount})`], ["Available", "Available"]].map(([v, l]) => (
          <button key={v} onClick={() => setActiveTab(v)} style={{ padding: "8px 16px", borderRadius: 8, background: activeTab === v ? C.purpleBg : C.card, color: activeTab === v ? C.purpleLight : C.textMuted, border: `1px solid ${activeTab === v ? C.purpleLight : C.border}`, fontSize: 13, fontWeight: activeTab === v ? 600 : 400, flexShrink: 0, whiteSpace: "nowrap" }}>{l}</button>
        ))}
      </div>
      {myTeamCount > 0 && activeTab !== "Available" && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>My Teams - Manage Requests</h3>
          {teams.filter(t => t.mine).map(t => (
            <div key={t.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: t.color + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Svg d={["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2", "M9 7a4 4 0 100 8 4 4 0 000-8z"]} size={18} stroke={t.color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{t.course}{t.requests > 0 ? <> · <span style={{ color: C.orange, fontWeight: 600 }}>{t.requests} New Requests</span></> : ""}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>{activeTab === "Mine" ? "My Teams" : activeTab === "Available" ? "Available Teams" : "All Teams"}</h3>
      {filtered.length === 0 && <div style={{ textAlign: "center", padding: 40, color: C.textMuted, fontSize: 13 }}>No teams found.</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {filtered.map(t => (
          <div key={t.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 11, background: t.color + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Svg d={["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2", "M9 7a4 4 0 100 8 4 4 0 000-8z"]} size={20} stroke={t.color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{t.name}</span>
                  {t.mine && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, border: `1px solid ${C.purple}`, color: C.purpleLight, fontWeight: 600 }}>Your Team</span>}
                </div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>
                  <span style={{ color: t.courseColor, fontWeight: 500 }}>{t.course}</span>{t.type ? ` · ${t.type}` : ""}
                </div>
              </div>
            </div>
            <p style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.6, marginBottom: 14 }}>{t.desc}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
              {[["Members", t.members, "👥"], ["Level", t.level, "⭐"], ["Created", t.created, "🕐"]].map(([l, v, ico]) => (
                <div key={l} style={{ background: C.bg, borderRadius: 8, padding: "10px" }}>
                  <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>{ico} {l}</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{v}</div>
                </div>
              ))}
            </div>
            {t.leader && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <InitialsAvatar name={t.leader} size={26} bg={getColor(t.leader)} />
                <div><div style={{ fontSize: 11, color: C.textMuted }}>Created by</div><div style={{ fontSize: 13, fontWeight: 600 }}>{t.leader}</div></div>
              </div>
            )}
            <button
              onClick={() => !t.mine && requestJoin(t)}
              disabled={t.mine || requested.includes(t.id)}
              style={{ width: "100%", background: requested.includes(t.id) ? C.greenBg : t.mine ? C.purpleBg : C.purple, color: requested.includes(t.id) ? C.green : t.mine ? C.purpleLight : "white", border: `1px solid ${requested.includes(t.id) ? C.green : C.purple}`, borderRadius: 8, padding: "11px 0", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: t.mine ? 0.7 : 1 }}>
              {t.mine ? "Member" : requested.includes(t.id) ? "✓ Requested" : <><Svg d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" size={14} stroke="white" /> Request to Join</>}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── ANNOUNCEMENTS ───────────────────────────────────────────────────────────── */
const TAG_STYLE = {
  Important: { color: C.red,      bg: C.redBg },
  General:   { color: C.textMuted, bg: C.white10 },
  Events:    { color: C.purple,   bg: C.purpleBg },
  Technical: { color: C.cyan,     bg: C.cyanBg },
  Academic:  { color: C.blue,     bg: C.blueBg },
};

function AnnouncementsView() {
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    api("/api/announcements").then(d => { if (Array.isArray(d)) setAnnouncements(d); }).catch(() => {});
  }, []);

  const ACard = ({ a }) => {
    const ts = TAG_STYLE[a.tag] || TAG_STYLE.General;
    const dt = new Date(a.created_at);
    return (
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: ts.bg, color: ts.color, fontWeight: 600 }}>{a.tag}</span>
          {a.is_pinned && <Svg d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" size={14} stroke={C.yellow} />}
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{a.title}</h3>
        <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.7, marginBottom: 12 }}>{a.body}</p>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.textDim }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Svg d={["M3 4h18v18H3z", "M16 2v4M8 2v4", "M3 10h18"]} size={12} stroke={C.textDim} />{dt.toLocaleDateString()}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Svg d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2" size={12} stroke={C.textDim} />{dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <span>{a.creator_name || ""}</span>
        </div>
      </div>
    );
  };

  const pinned = announcements.filter(a => a.is_pinned);
  const others  = announcements.filter(a => !a.is_pinned);

  return (
    <div className="fade-up" style={{ padding: 20, maxWidth: 800 }}>
      {pinned.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
            <Svg d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" size={16} stroke={C.yellow} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Pinned</span>
          </div>
          {pinned.map(a => <ACard key={a.id} a={a} />)}
        </>
      )}
      {others.length > 0 && (
        <>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6, marginBottom: 14 }}>All Announcements</div>
          {others.map(a => <ACard key={a.id} a={a} />)}
        </>
      )}
      {announcements.length === 0 && <div style={{ color: C.textMuted, fontSize: 13 }}>No announcements yet.</div>}
    </div>
  );
}

/* ─── CHAT ────────────────────────────────────────────────────────────────────── */
function ChatView({ channelId, channelName, isClub = false, channelType, memberCount = 0, onlineCount = 0, headerRight }) {
  const user = useContext(UserContext);
  const toast = useToast();
  const [msg, setMsg] = useState("");
  const [msgs, setMsgs] = useState([]);
  const [memberInfo, setMemberInfo] = useState({ total: memberCount, online: onlineCount });
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const ct = channelType || (isClub ? "club" : "course");

  useEffect(() => {
    if (!channelId) return;
    setMsgs([]);
    api(`/api/messages?channel_type=${ct}&channel_id=${channelId}&limit=50`)
      .then(d => {
        if (Array.isArray(d)) setMsgs(d.map(m => ({
          id: m.id,
          sender: m.sender_name,
          time: new Date(m.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          text: m.content,
          self: m.sender_id === user?.id,
        })));
      }).catch(() => {});
    if (!isClub && ct === "course") {
      api(`/api/courses/${channelId}/members`).then(d => {
        if (Array.isArray(d)) setMemberInfo({ total: d.length, online: d.filter(m => m.is_online).length });
      }).catch(() => {});
    }
  }, [channelId, ct]);

  const send = async () => {
    if (!msg.trim()) return;
    const content = msg;
    setMsg("");
    try {
      const res = await api("/api/messages", { method: "POST", body: { channel_type: ct, channel_id: channelId, content } });
      if (res.id) setMsgs(p => [...p, {
        id: res.id,
        sender: res.sender_name || user?.full_name || "You",
        time: new Date(res.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        text: res.content,
        self: true,
      }]);
    } catch { toast("Failed to send message", "error"); }
  };

  const attachFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (ct !== "course") { toast("File sharing is only supported in course channels", "info"); return; }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", file.name);
    fd.append("type", "pdf");
    const token = localStorage.getItem("token");
    try {
      const r = await fetch(`/api/courses/${channelId}/materials`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      const res = await r.json();
      if (res.error) { toast(res.error, "error"); return; }
      const fileUrl = res.url || "";
      await api("/api/messages", { method: "POST", body: { channel_type: ct, channel_id: channelId, content: `📎 Shared a file: ${file.name}${fileUrl ? ` (${fileUrl})` : ""}` } });
      toast(`"${file.name}" shared in Materials!`, "success");
    } catch { toast("Upload failed", "error"); }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isClub ? <Svg d={["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2", "M9 7a4 4 0 100 8 4 4 0 000-8z"]} size={18} stroke={C.textMuted} /> : <span style={{ color: C.textMuted, fontSize: 18, fontWeight: 700, lineHeight: 1 }}>#</span>}
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{channelName}</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>{memberInfo.total} members · {memberInfo.online} online</div>
          </div>
        </div>
        {headerRight && <div style={{ display: "flex", gap: 6 }}>{headerRight}</div>}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        {msgs.map(m => (
          <div key={m.id} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <InitialsAvatar name={m.sender} size={36} bg={getColor(m.sender)} />
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{m.sender}</span>
                <span style={{ fontSize: 11, color: C.textDim }}>{m.time}</span>
              </div>
              <div style={{ fontSize: 14, color: C.text, lineHeight: 1.55 }}>{m.text}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: "10px 16px 12px", borderTop: `1px solid ${C.border}`, flexShrink: 0, display: "flex", alignItems: "center", gap: 10 }}>
        <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={attachFile} />
        <button onClick={() => fileInputRef.current?.click()} title="Attach file" style={{ color: C.textMuted, padding: 6 }}><Svg d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" size={18} /></button>
        <input value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
          placeholder={`Message ${channelName}`}
          style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 14px", color: C.text, fontSize: 14 }} />
        <button onClick={() => toast("Voice messages coming soon", "info")} style={{ color: C.textMuted, padding: 6 }}><Svg d="M14 9a2 2 0 10-4 0v5a2 2 0 104 0V9z M19 10v2a7 7 0 01-14 0v-2" size={18} /></button>
        <button onClick={send} style={{ color: C.textMuted, padding: 6 }}><Svg d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" size={18} /></button>
      </div>
    </div>
  );
}

/* ─── AI ASSISTANT ────────────────────────────────────────────────────────────── */

// Renders a subset of Markdown: bold, inline code, code blocks, bullet lists, numbered lists, tables, line breaks
function MarkdownText({ text }) {
  if (!text) return null;

  // Split into lines for processing
  const lines = text.split("\n");
  const elements = [];
  let i = 0;
  let keyCount = 0;
  const key = () => keyCount++;

  const inlineRender = (raw) => {
    // Parse inline: **bold**, *italic*, `code`, and plain text
    const parts = [];
    let rest = raw;
    const inlineRx = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g;
    let lastIdx = 0;
    let m;
    inlineRx.lastIndex = 0;
    while ((m = inlineRx.exec(rest)) !== null) {
      if (m.index > lastIdx) parts.push(<span key={key()}>{rest.slice(lastIdx, m.index)}</span>);
      if (m[2] !== undefined) parts.push(<strong key={key()} style={{ color: C.text, fontWeight: 600 }}>{m[2]}</strong>);
      else if (m[3] !== undefined) parts.push(<em key={key()} style={{ color: C.textMuted }}>{m[3]}</em>);
      else if (m[4] !== undefined) parts.push(
        <code key={key()} style={{ background: C.white10, border: `1px solid ${C.border}`, borderRadius: 4, padding: "1px 6px", fontSize: 12.5, fontFamily: "monospace", color: C.blue }}>{m[4]}</code>
      );
      lastIdx = m.index + m[0].length;
    }
    if (lastIdx < rest.length) parts.push(<span key={key()}>{rest.slice(lastIdx)}</span>);
    return parts.length ? parts : [<span key={key()}>{raw}</span>];
  };

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block ```
    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <div key={key()} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", margin: "8px 0" }}>
          {lang && <div style={{ background: C.white10, padding: "4px 12px", fontSize: 11, color: C.textMuted, fontFamily: "monospace" }}>{lang}</div>}
          <pre style={{ margin: 0, padding: "12px 14px", overflowX: "auto", fontSize: 13, lineHeight: 1.6, fontFamily: "monospace", color: C.text }}>{codeLines.join("\n")}</pre>
        </div>
      );
      i++;
      continue;
    }

    // Table row
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const rows = [];
      let isHeader = true;
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i].trim().slice(1, -1).split("|").map(c => c.trim());
        const isSep = cells.every(c => /^[-:]+$/.test(c));
        if (!isSep) rows.push({ cells, isHeader });
        else isHeader = false;
        i++;
      }
      elements.push(
        <div key={key()} style={{ overflowX: "auto", margin: "8px 0" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} style={{ borderBottom: `1px solid ${C.border}`, background: ri === 0 ? C.white10 : ri % 2 === 0 ? C.white10 : "transparent" }}>
                  {r.cells.map((c, ci) => {
                    const Tag = r.isHeader ? "th" : "td";
                    return <Tag key={ci} style={{ padding: "7px 12px", textAlign: "left", fontWeight: r.isHeader ? 600 : 400, color: r.isHeader ? C.purpleLight : C.text, whiteSpace: "nowrap" }}>{inlineRender(c)}</Tag>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Heading ### ## #
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const sizes = { 1: 18, 2: 16, 3: 15 };
      elements.push(
        <div key={key()} style={{ fontSize: sizes[level] || 14, fontWeight: 700, color: C.text, margin: level === 1 ? "14px 0 6px" : "10px 0 4px", borderBottom: level === 1 ? `1px solid ${C.border}` : "none", paddingBottom: level === 1 ? 6 : 0 }}>
          {inlineRender(headingMatch[2])}
        </div>
      );
      i++; continue;
    }

    // Bullet list
    if (/^[\s]*[-*•]\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^[\s]*[-*•]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[\s]*[-*•]\s/, "").trim());
        i++;
      }
      elements.push(
        <ul key={key()} style={{ margin: "6px 0", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 3 }}>
          {items.map((it, ii) => (
            <li key={ii} style={{ color: C.text, lineHeight: 1.6, paddingLeft: 2 }}>
              <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: C.purple, marginRight: 8, verticalAlign: "middle", flexShrink: 0 }} />
              {inlineRender(it)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line.trim())) {
      const items = [];
      let startNum = parseInt(line.trim().match(/^(\d+)/)[1]);
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s/, "").trim());
        i++;
      }
      elements.push(
        <ol key={key()} start={startNum} style={{ margin: "6px 0", paddingLeft: 22, display: "flex", flexDirection: "column", gap: 3 }}>
          {items.map((it, ii) => (
            <li key={ii} style={{ color: C.text, lineHeight: 1.6 }}>{inlineRender(it)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line.trim())) {
      elements.push(<hr key={key()} style={{ border: "none", borderTop: `1px solid ${C.border}`, margin: "10px 0" }} />);
      i++; continue;
    }

    // Blockquote
    if (line.trim().startsWith(">")) {
      elements.push(
        <div key={key()} style={{ borderLeft: `3px solid ${C.purple}`, paddingLeft: 12, margin: "6px 0", color: C.textMuted, fontStyle: "italic" }}>
          {inlineRender(line.trim().slice(1).trim())}
        </div>
      );
      i++; continue;
    }

    // Empty line → spacer
    if (line.trim() === "") {
      elements.push(<div key={key()} style={{ height: 6 }} />);
      i++; continue;
    }

    // Normal paragraph
    elements.push(
      <p key={key()} style={{ margin: 0, lineHeight: 1.65 }}>{inlineRender(line)}</p>
    );
    i++;
  }

  return <div style={{ fontSize: 14, color: C.text }}>{elements}</div>;
}

const INTENT_LABELS = {
  greeting: "👋 Hello", today_schedule: "📅 Today", tomorrow_schedule: "📅 Tomorrow",
  week_schedule: "📅 This Week", quiz: "📝 Quiz", midterm: "📝 Midterm", final: "📝 Final",
  tasks: "✅ Tasks", my_courses: "🎓 Courses", course_students: "👥 Students",
  instructor: "🧑‍🏫 Instructor", announcements: "📣 Announcements", clubs: "🏛️ Clubs",
  gpa_help: "📊 GPA", study_plan: "📚 Study Plan", study_tips: "💡 Study Tips",
  time_management: "⏱️ Time Mgmt", motivation: "🚀 Motivation", explain: "🔍 Explain",
  help: "❓ Help", unknown: null,
};

const QUICK_SUGGESTIONS = [
  { icon: "📅", label: "What's my schedule today?" },
  { icon: "✅", label: "What tasks are due this week?" },
  { icon: "🔍", label: "Explain Big O notation" },
  { icon: "📚", label: "Give me a study plan for exams" },
  { icon: "🧠", label: "How does recursion work?" },
  { icon: "🚀", label: "I feel overwhelmed, help me" },
];

function AIAssistant() {
  const user = useContext(UserContext);
  const [msgs, setMsgs] = useState([{
    role: "assistant",
    text: "Hello! 👋 I'm your **AI Study Assistant**.\n\nI can help you with:\n- 📅 Your schedule and upcoming events\n- ✅ Tasks and deadlines\n- 🎓 Course info and announcements\n- 🔍 Explaining CS, math & more\n- 📚 Study plans and tips\n- 🚀 Motivation when you need it\n\nWhat would you like help with today?",
    ts: Date.now(),
    intent: "greeting",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const copyMsg = (text, idx) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(idx);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const clearChat = () => {
    setMsgs([{
      role: "assistant",
      text: "Chat cleared! How can I help you?",
      ts: Date.now(),
      intent: "greeting",
    }]);
  };

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    const newUserMsg = { role: "user", text: q, ts: Date.now() };
    setMsgs(p => [...p, newUserMsg]);
    setInput("");
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const currentMsgs = [...msgs, newUserMsg];
      const history = currentMsgs.slice(-10).map(m => ({ role: m.role, text: m.text }));
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ message: q, history }),
      });
      const data = await res.json();
      setMsgs(p => [...p, {
        role: "assistant",
        text: data.answer || "Sorry, I couldn't process that.",
        ts: Date.now(),
        intent: data.intent || "unknown",
      }]);
    } catch {
      setMsgs(p => [...p, { role: "assistant", text: "⚠️ Network error. Please try again.", ts: Date.now(), intent: "unknown" }]);
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const fmtTime = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const botGrad = `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bg }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderBottom: `1px solid ${C.border}`, flexShrink: 0, background: C.sidebar }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: botGrad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 0 14px ${C.purpleBg}` }}>
          <Svg d={["M12 8V4H8", "M3 8h18v11a2 2 0 01-2 2H5a2 2 0 01-2-2z", "M9 13h.01M15 13h.01"]} size={20} stroke="white" sw={1.8} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>AI Study Assistant</div>
          <div style={{ fontSize: 11, color: C.green, display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green }} />
            Online · Powered by Universe AI
          </div>
        </div>
        <button onClick={clearChat} title="Clear chat"
          style={{ padding: "7px 12px", borderRadius: 8, background: C.white10, border: `1px solid ${C.border}`, color: C.textMuted, fontSize: 12, display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.red; e.currentTarget.style.color = C.red; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}>
          <Svg d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" size={14} stroke="currentColor" />
          Clear
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 8px", display: "flex", flexDirection: "column", gap: 18 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", gap: 10, justifyContent: m.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-start", animation: "fadeUp 0.2s ease" }}>
            {m.role === "assistant" && (
              <div style={{ width: 34, height: 34, borderRadius: 10, background: botGrad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                <Svg d={["M12 8V4H8", "M3 8h18v11a2 2 0 01-2 2H5a2 2 0 01-2-2z", "M9 13h.01M15 13h.01"]} size={17} stroke="white" sw={1.8} />
              </div>
            )}
            <div style={{ maxWidth: "78%", display: "flex", flexDirection: "column", gap: 4, alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
              {/* Intent badge for assistant */}
              {m.role === "assistant" && m.intent && m.intent !== "unknown" && INTENT_LABELS[m.intent] && (
                <div style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: C.purpleBg, border: `1px solid ${C.purpleBg2}`, color: C.purpleLight, fontWeight: 600, letterSpacing: 0.3 }}>
                  {INTENT_LABELS[m.intent]}
                </div>
              )}
              {/* Bubble */}
              <div className="ai-msg-bubble" style={{ position: "relative", padding: "12px 15px", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px", background: m.role === "user" ? C.purple : C.card, border: m.role === "user" ? "none" : `1px solid ${C.border}`, boxShadow: m.role === "user" ? `0 2px 12px ${C.purpleBg}` : "none", color: m.role === "user" ? "white" : C.text }}>
                {m.role === "user"
                  ? <p style={{ margin: 0, lineHeight: 1.65, fontSize: 14 }}>{m.text}</p>
                  : <MarkdownText text={m.text} />
                }
                {/* Copy button (assistant only) */}
                {m.role === "assistant" && (
                  <button onClick={() => copyMsg(m.text, i)} title="Copy"
                    style={{ position: "absolute", top: 8, right: 8, padding: "3px 6px", borderRadius: 6, background: C.white10, border: `1px solid ${C.border}`, color: copied === i ? C.green : C.textMuted, fontSize: 11, opacity: 0, transition: "opacity 0.15s" }}
                    className="copy-btn">
                    {copied === i ? "✓ Copied" : "Copy"}
                  </button>
                )}
              </div>
              {/* Timestamp */}
              {m.ts && <div style={{ fontSize: 10, color: C.textDim, paddingLeft: m.role === "user" ? 0 : 4 }}>{fmtTime(m.ts)}</div>}
            </div>
            {m.role === "user" && <InitialsAvatar name={user?.full_name || "You"} size={34} bg={C.purple} style={{ marginTop: 2 }} />}
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", animation: "fadeUp 0.2s ease" }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: botGrad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Svg d={["M12 8V4H8", "M3 8h18v11a2 2 0 01-2 2H5a2 2 0 01-2-2z", "M9 13h.01M15 13h.01"]} size={17} stroke="white" sw={1.8} />
            </div>
            <div style={{ padding: "14px 18px", borderRadius: "4px 16px 16px 16px", background: C.card, border: `1px solid ${C.border}`, display: "flex", gap: 5, alignItems: "center" }}>
              {[0, 1, 2].map(j => (
                <div key={j} style={{ width: 7, height: 7, borderRadius: "50%", background: C.purple, animation: "aiDot 1.4s ease infinite", animationDelay: `${j * 0.22}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick suggestions */}
      <div style={{ padding: "10px 20px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {QUICK_SUGGESTIONS.map(s => (
            <button key={s.label} onClick={() => send(s.label)}
              style={{ fontSize: 12, padding: "5px 11px", borderRadius: 20, background: C.white10, border: `1px solid ${C.border}`, color: C.textMuted, transition: "all 0.15s", display: "flex", alignItems: "center", gap: 4 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.purple; e.currentTarget.style.color = C.text; e.currentTarget.style.background = C.purpleBg; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; e.currentTarget.style.background = C.white10; }}>
              <span>{s.icon}</span>{s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div style={{ padding: "10px 20px 16px", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "6px 6px 6px 14px", transition: "border-color 0.15s" }}
          onFocusCapture={e => e.currentTarget.style.borderColor = C.purple}
          onBlurCapture={e => e.currentTarget.style.borderColor = C.border}>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask anything about your studies…"
            style={{ flex: 1, background: "transparent", border: "none", color: C.text, fontSize: 14, padding: "6px 0" }} />
          <button onClick={() => send()} disabled={loading || !input.trim()}
            style={{ background: input.trim() && !loading ? C.purple : C.white10, color: input.trim() && !loading ? "white" : C.textDim, borderRadius: 8, padding: "8px 14px", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500 }}>
            <Svg d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" size={15} stroke="currentColor" />
            Send
          </button>
        </div>
        <div style={{ fontSize: 11, color: C.textDim, marginTop: 6, paddingLeft: 2 }}>Press Enter to send · Shift+Enter for new line</div>
      </div>

      <style>{`
        .copy-btn { opacity: 0 !important; transition: opacity 0.15s; }
        .ai-msg-bubble:hover .copy-btn { opacity: 1 !important; }
        @keyframes aiDot { 0%,80%,100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}

/* ─── SETTINGS ────────────────────────────────────────────────────────────────── */
function SettingsView({ onSignOut, onThemeChange }) {
  const user = useContext(UserContext);
  const toast = useToast();
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const [notifs, setNotifs] = useState({ announcements: true, reminders: true, events: true });
  const [visibility, setVisibility] = useState("Everyone");
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState(user?.full_name || "");
  const [editEmail, setEditEmail] = useState(user?.email || "");
  const [changingPw, setChangingPw] = useState(false);
  const [oldPw, setOldPw] = useState(""); const [newPw, setNewPw] = useState(""); const [confirmPw, setConfirmPw] = useState("");

  useEffect(() => {
    api("/api/users/settings").then(d => {
      if (d && !d.error) {
        if (d.theme) setTheme(d.theme);
        setNotifs({ announcements: d.notif_announcements ?? true, reminders: d.notif_reminders ?? true, events: d.notif_events ?? true });
        if (d.profile_visibility) setVisibility(d.profile_visibility);
      }
    }).catch(() => {});
  }, []);

  const saveNotifs = async (key, val) => {
    const updated = { ...notifs, [key]: val };
    setNotifs(updated);
    try {
      await api("/api/users/settings", { method: "PATCH", body: { [`notif_${key}`]: val } });
      toast("Preference saved", "success");
    } catch { toast("Failed to save preference", "error"); }
  };

  const saveTheme = async (t) => {
    setTheme(t);
    onThemeChange?.(t);
    try { await api("/api/users/settings", { method: "PATCH", body: { theme: t } }); }
    catch { /* silent */ }
  };

  const saveProfile = async () => {
    if (!editName.trim()) { toast("Name cannot be empty", "error"); return; }
    try {
      await api("/api/users/profile", { method: "PATCH", body: { full_name: editName } });
      toast("Profile updated!", "success");
      setEditingProfile(false);
    } catch (e) { toast(e.message || "Failed to update profile", "error"); }
  };

  const savePassword = async () => {
    if (!oldPw || !newPw) { toast("Please fill all fields", "error"); return; }
    if (newPw !== confirmPw) { toast("Passwords don't match", "error"); return; }
    if (newPw.length < 6) { toast("Password must be at least 6 characters", "error"); return; }
    try {
      await api("/api/users/password", { method: "PATCH", body: { current_password: oldPw, new_password: newPw } });
      toast("Password changed successfully!", "success");
      setChangingPw(false); setOldPw(""); setNewPw(""); setConfirmPw("");
    } catch (e) { toast(e.message || "Failed to change password", "error"); }
  };

  return (
    <div style={{ padding: 22, overflowY: "auto" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}><Svg d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 12m-3 0a3 3 0 106 0 3 3 0 00-6 0" size={16} stroke={C.purpleLight} /><span style={{ fontWeight: 700, fontSize: 15 }}>Appearance</span></div>
        <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 14, paddingLeft: 24 }}>Choose your preferred theme for the UniVerse platform</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {[{ id: "light", label: "Light Mode", sub: "Bright & clear", icon: "☀️" }, { id: "dark", label: "Dark Mode", sub: "Easy on eyes", icon: "🌙" }, { id: "cool", label: "Cool Mode", sub: "Fresh & modern", icon: "⚡" }].map(t => (
            <button key={t.id} onClick={() => saveTheme(t.id)} style={{ padding: "16px 14px", borderRadius: 10, border: `2px solid ${theme === t.id ? C.purple : C.border}`, background: theme === t.id ? C.purpleBg2 : C.card, position: "relative", textAlign: "center", transition: "all 0.15s" }}>
              {theme === t.id && <div style={{ position: "absolute", top: 8, right: 8, width: 18, height: 18, borderRadius: "50%", background: C.purple, display: "flex", alignItems: "center", justifyContent: "center" }}><Svg d="M20 6L9 17l-5-5" size={10} stroke="white" sw={2.5} /></div>}
              <div style={{ fontSize: 24, marginBottom: 8 }}>{t.icon}</div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{t.label}</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{t.sub}</div>
              <div style={{ height: 4, borderRadius: 99, background: t.id === "cool" ? C.cyan : t.id === "light" ? "#cbd5e1" : C.purple, margin: "10px 0 0", opacity: 0.6 }} />
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><Svg d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z" size={16} stroke={C.text} /><span style={{ fontWeight: 700, fontSize: 15 }}>Account</span></div>
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: editingProfile ? 12 : 0 }}>
            <div><div style={{ fontWeight: 600, fontSize: 14 }}>Profile Information</div><div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>Update your name and email</div></div>
            <button onClick={() => setEditingProfile(p => !p)} style={{ background: C.purple, color: "white", borderRadius: 7, padding: "7px 16px", fontSize: 13, fontWeight: 600 }}>{editingProfile ? "Cancel" : "Edit"}</button>
          </div>
          {editingProfile && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div><label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 4 }}>Full Name</label><input value={editName} onChange={e => setEditName(e.target.value)} style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 12px", color: C.text, fontSize: 13 }} /></div>
              <div><label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 4 }}>Email</label><input value={editEmail} onChange={e => setEditEmail(e.target.value)} style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 12px", color: C.text, fontSize: 13 }} /></div>
              <button onClick={saveProfile} style={{ background: C.purple, color: "white", borderRadius: 7, padding: "8px 0", fontSize: 13, fontWeight: 600, width: "100%" }}>Save Changes</button>
            </div>
          )}
        </div>
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: changingPw ? 12 : 0 }}>
            <div><div style={{ fontWeight: 600, fontSize: 14 }}>Change Password</div><div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>Update your password to keep your account secure</div></div>
            <button onClick={() => setChangingPw(p => !p)} style={{ background: C.card, color: C.text, border: `1px solid ${C.borderLight}`, borderRadius: 7, padding: "7px 16px", fontSize: 13, fontWeight: 600 }}>{changingPw ? "Cancel" : "Change"}</button>
          </div>
          {changingPw && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[["Current Password", oldPw, setOldPw], ["New Password", newPw, setNewPw], ["Confirm New Password", confirmPw, setConfirmPw]].map(([label, val, setter]) => (
                <div key={label}><label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 4 }}>{label}</label><input type="password" value={val} onChange={e => setter(e.target.value)} style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 12px", color: C.text, fontSize: 13 }} /></div>
              ))}
              <button onClick={savePassword} style={{ background: C.purple, color: "white", borderRadius: 7, padding: "8px 0", fontSize: 13, fontWeight: 600, width: "100%" }}>Update Password</button>
            </div>
          )}
        </div>
      </div>
      <div style={{ marginBottom: 4, marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><Svg d={["M22 17H2a3 3 0 000 6h1", "M18 9a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9", "M13.73 21a2 2 0 01-3.46 0"]} size={16} stroke={C.green} /><span style={{ fontWeight: 700, fontSize: 15 }}>Notifications</span></div>
        {[{ k: "announcements", l: "Course Announcements", s: "Get notified about new course announcements" }, { k: "reminders", l: "Assignment Reminders", s: "Receive reminders for upcoming assignments" }, { k: "events", l: "Event Notifications", s: "Stay updated on club events and meetings" }].map(n => (
          <div key={n.k} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><div style={{ fontWeight: 600, fontSize: 14 }}>{n.l}</div><div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{n.s}</div></div>
            <Toggle on={notifs[n.k]} onChange={v => saveNotifs(n.k, v)} />
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 4, marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><Svg d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" size={16} stroke={C.orange} /><span style={{ fontWeight: 700, fontSize: 15 }}>Privacy & Security</span></div>
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={{ fontWeight: 600, fontSize: 14 }}>Profile Visibility</div><div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>Control who can see your profile</div></div>
          <select value={visibility} onChange={e => { setVisibility(e.target.value); toast("Visibility updated", "success"); }} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: "6px 10px", color: C.text, fontSize: 13 }}><option>Everyone</option><option>Students Only</option><option>Private</option></select>
        </div>
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={{ fontWeight: 600, fontSize: 14 }}>Two-Factor Authentication</div><div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>Add an extra layer of security</div></div>
          <button onClick={() => toast("Two-factor authentication coming soon", "info")} style={{ background: C.card, color: C.text, border: `1px solid ${C.borderLight}`, borderRadius: 7, padding: "7px 16px", fontSize: 13, fontWeight: 600 }}>Enable</button>
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><Svg d={["M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4", "M16 17l5-5-5-5", "M21 12H9"]} size={16} stroke={C.red} /><span style={{ fontWeight: 700, fontSize: 15 }}>Session</span></div>
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={{ fontWeight: 600, fontSize: 14 }}>Sign Out</div><div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>End your current session and return to login</div></div>
          <button onClick={onSignOut} style={{ background: C.red, color: "white", borderRadius: 7, padding: "7px 14px", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            <Svg d={["M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4", "M16 17l5-5-5-5", "M21 12H9"]} size={13} stroke="white" /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── INSTRUCTOR HOME ─────────────────────────────────────────────────────────── */
function InstructorHome({ courses = [], onNav }) {
  const toast = useToast();
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const totalStudents = courses.reduce((s, c) => s + (parseInt(c.student_count) || 0), 0);

  useEffect(() => {
    api("/api/announcements").then(d => { if (Array.isArray(d)) setAnnouncements(d.slice(0, 4)); }).catch(() => {});
    const now = new Date();
    const wkEnd = new Date(now); wkEnd.setDate(now.getDate() + 7);
    api(`/api/events?from=${now.toISOString()}&to=${wkEnd.toISOString()}`).then(d => { if (Array.isArray(d)) setEvents(d.slice(0, 4)); }).catch(() => {});
  }, []);

  return (
    <div className="fade-up" style={{ padding: 20 }}>
      {/* Quick stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        {[
          { l: "My Courses",      v: courses.length,   icon: "M4 19.5A2.5 2.5 0 016.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z", col: C.blue,   bg: C.blueBg },
          { l: "Total Students",  v: totalStudents,    icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 7a4 4 0 100 8 4 4 0 000-8z",                        col: C.green,  bg: C.greenBg },
          { l: "Announcements",   v: announcements.length, icon: ["M22 17H2a3 3 0 000 6h1","M18 9a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9","M13.73 21a2 2 0 01-3.46 0"], col: C.purple, bg: C.purpleBg },
          { l: "Events This Week",v: events.length,    icon: ["M3 4h18v18H3z","M16 2v4M8 2v4","M3 10h18"],                                                    col: C.orange, bg: C.orangeBg },
        ].map(s => (
          <div key={s.l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Svg d={s.icon} size={20} stroke={s.col} /></div>
            <div><div style={{ fontSize: 11, color: C.textMuted, marginBottom: 3 }}>{s.l}</div><div style={{ fontSize: 24, fontWeight: 800 }}>{s.v}</div></div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        {[
          { l: "Manage Courses",    s: "Create & view your courses",        i: "M4 19.5A2.5 2.5 0 016.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z",                                                        bg: "#1a2035", col: C.blue,   nav: "instructor-courses" },
          { l: "Post Announcement", s: "Share updates with students",       i: ["M22 17H2a3 3 0 000 6h1","M18 9a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9","M13.73 21a2 2 0 01-3.46 0"],                                              bg: "#1a1535", col: C.purple, nav: "instructor-announcements" },
          { l: "Schedule Event",    s: "Add lectures, exams & office hours", i: ["M3 4h18v18H3z","M16 2v4M8 2v4","M3 10h18"],                                                                                                       bg: "#0d2015", col: C.green,  nav: "calendar" },
        ].map(b => (
          <button key={b.l} onClick={() => onNav(b.nav)} style={{ background: b.bg, border: `1px solid ${b.col}33`, borderRadius: 12, padding: "18px 16px", textAlign: "left", display: "flex", alignItems: "center", gap: 12, transition: "opacity 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.85"} onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: b.col + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Svg d={b.i} size={22} stroke={b.col} /></div>
            <div><div style={{ fontWeight: 700, fontSize: 14 }}>{b.l}</div><div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{b.s}</div></div>
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* My Courses */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Svg d="M4 19.5A2.5 2.5 0 016.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" size={15} stroke={C.text} /><span style={{ fontWeight: 700, fontSize: 14 }}>My Courses</span></div>
            <button onClick={() => onNav("instructor-courses")} style={{ fontSize: 12, color: C.purpleLight, fontWeight: 500 }}>View All →</button>
          </div>
          {courses.length === 0 && <div style={{ fontSize: 13, color: C.textMuted, padding: "10px 0" }}>No courses yet. <button onClick={() => onNav("instructor-courses")} style={{ color: C.purpleLight, fontWeight: 600, fontSize: 13 }}>Create one →</button></div>}
          {courses.slice(0, 4).map(c => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: (c.color || C.blue) + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Svg d="M4 19.5A2.5 2.5 0 016.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" size={16} stroke={c.color || C.blue} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>{c.code} · {parseInt(c.student_count) || 0} students</div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Announcements */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Svg d={["M22 17H2a3 3 0 000 6h1","M18 9a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9","M13.73 21a2 2 0 01-3.46 0"]} size={15} stroke={C.text} /><span style={{ fontWeight: 700, fontSize: 14 }}>Recent Announcements</span></div>
            <button onClick={() => onNav("instructor-announcements")} style={{ fontSize: 12, color: C.purpleLight, fontWeight: 500 }}>View All →</button>
          </div>
          {announcements.length === 0 && <div style={{ fontSize: 13, color: C.textMuted, padding: "10px 0" }}>No announcements yet.</div>}
          {announcements.map((a, i) => {
            const ts = TAG_STYLE[a.tag] || TAG_STYLE.General;
            return (
              <div key={a.id} style={{ padding: "9px 0", borderBottom: i < announcements.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: ts.bg, color: ts.color, fontWeight: 600 }}>{a.tag}</span>
                  {a.is_pinned && <Svg d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" size={11} stroke={C.yellow} />}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{new Date(a.created_at).toLocaleDateString()}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── ADMIN DASHBOARD ────────────────────────────────────────────────────────── */
function AdminDashboard({ onNav }) {
  const [stats, setStats] = useState(null);
  useEffect(() => { api("/api/admin/stats").then(d => { if (!d.error) setStats(d); }).catch(() => {}); }, []);

  const ROLE_COLORS = { admin: C.red, instructor: C.purple, student: C.blue, club_member: C.green, student_club: C.cyan };

  return (
    <div className="fade-up" style={{ padding: 20 }}>
      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { l: "Total Users",      v: stats?.total_users      ?? "—", icon: ["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2","M9 7a4 4 0 100 8 4 4 0 000-8z"], col: C.blue,   bg: C.blueBg,   nav: "admin-users" },
          { l: "Total Courses",    v: stats?.total_courses    ?? "—", icon: "M4 19.5A2.5 2.5 0 016.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z", col: C.purple, bg: C.purpleBg, nav: "admin-courses" },
          { l: "Messages Today",   v: stats?.messages_today   ?? "—", icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",                                    col: C.orange, bg: C.orangeBg, nav: "admin-messages" },
          { l: "Active Users Now", v: stats?.active_users     ?? "—", icon: "M22 12h-4l-3 9L9 3l-3 9H2",                                                                    col: C.green,  bg: C.greenBg,  nav: "admin-users" },
        ].map(s => (
          <button key={s.l} onClick={() => onNav(s.nav)} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, textAlign: "left", transition: "border-color 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = s.col} onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Svg d={s.icon} size={20} stroke={s.col} /></div>
            <div><div style={{ fontSize: 11, color: C.textMuted, marginBottom: 3 }}>{s.l}</div><div style={{ fontSize: 26, fontWeight: 800 }}>{s.v}</div></div>
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        {/* More stats */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Svg d="M22 12h-4l-3 9L9 3l-3 9H2" size={16} stroke={C.text} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Platform Overview</span>
          </div>
          {[
            ["Total Messages",    stats?.total_messages   ?? "—", C.blue],
            ["New Users This Week",stats?.new_users_week  ?? "—", C.green],
            ["Total Clubs",       stats?.total_clubs      ?? "—", C.purple],
          ].map(([l,v,c]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 13, color: C.textMuted }}>{l}</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: c }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Role breakdown */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Svg d={["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2","M9 7a4 4 0 100 8 4 4 0 000-8z"]} size={16} stroke={C.text} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Users by Role</span>
          </div>
          {(stats?.role_breakdown || []).map(rb => {
            const col = ROLE_COLORS[rb.role] || C.textMuted;
            const pct = stats?.total_users ? Math.round((rb.count / stats.total_users) * 100) : 0;
            return (
              <div key={rb.role} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: col, fontWeight: 600, textTransform: "capitalize" }}>{rb.role.replace("_"," ")}</span>
                  <span style={{ color: C.textMuted }}>{rb.count} ({pct}%)</span>
                </div>
                <div style={{ background: C.border, borderRadius: 99, height: 5 }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: col, borderRadius: 99, transition: "width 0.5s" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        {[
          { l: "Manage Users",         s: "View, search & update roles",     icon: ["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2","M9 7a4 4 0 100 8 4 4 0 000-8z"], col: C.blue,   bg: "#1a2035", nav: "admin-users" },
          { l: "Monitor Chats",         s: "Review & moderate messages",       icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",                  col: C.orange, bg: "#201808", nav: "admin-messages" },
          { l: "Post Announcement",     s: "Broadcast to all students",        icon: ["M22 17H2a3 3 0 000 6h1","M18 9a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9","M13.73 21a2 2 0 01-3.46 0"], col: C.purple, bg: "#1a1535", nav: "admin-announcements" },
        ].map(b => (
          <button key={b.l} onClick={() => onNav(b.nav)} style={{ background: b.bg, border: `1px solid ${b.col}33`, borderRadius: 12, padding: "18px 16px", textAlign: "left", display: "flex", alignItems: "center", gap: 14, transition: "opacity 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.opacity="0.85"} onMouseLeave={e => e.currentTarget.style.opacity="1"}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: b.col+"22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Svg d={b.icon} size={22} stroke={b.col} /></div>
            <div><div style={{ fontWeight: 700, fontSize: 14 }}>{b.l}</div><div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{b.s}</div></div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── ADMIN USERS ─────────────────────────────────────────────────────────────── */
const ROLE_OPTS = ["student","instructor","club_member","student_club","admin"];
const ROLE_COL  = { admin: C.red, instructor: "#a855f7", student: C.blue, club_member: C.green, student_club: C.cyan };

function AdminUsersView() {
  const toast = useToast();
  const [users, setUsers]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [pages, setPages]     = useState(1);
  const [page,  setPage]      = useState(1);
  const [search, setSearch]   = useState("");
  const [roleF,  setRoleF]    = useState("");
  const [loading, setLoading] = useState(false);
  const [changing, setChanging] = useState(null); // { id, currentRole }

  const load = useCallback(async (pg = 1, s = search, r = roleF) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: 20, ...(s && { search: s }), ...(r && { role: r }) });
      const d = await api(`/api/admin/users?${params}`);
      if (d.users) { setUsers(d.users); setTotal(d.total); setPages(d.pages); setPage(pg); }
    } catch {}
    setLoading(false);
  }, [search, roleF]);

  useEffect(() => { load(1, "", ""); }, []);

  const changeRole = async (userId, newRole) => {
    try {
      const res = await api(`/api/admin/users/${userId}/role`, { method: "PATCH", body: { role: newRole } });
      if (res.error) { toast(res.error, "error"); return; }
      setUsers(p => p.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast(`Role updated to ${newRole}`, "success");
      setChanging(null);
    } catch { toast("Failed to update role", "error"); }
  };

  const deleteUser = async (u) => {
    if (!window.confirm(`Delete ${u.full_name}? This cannot be undone.`)) return;
    try {
      await api(`/api/admin/users/${u.id}`, { method: "DELETE" });
      setUsers(p => p.filter(x => x.id !== u.id));
      setTotal(t => t - 1);
      toast("User deleted", "success");
    } catch { toast("Failed to delete user", "error"); }
  };

  return (
    <div className="fade-up" style={{ padding: 20 }}>
      {/* Search & filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
          <Svg d="M11 17.25a6.25 6.25 0 110-12.5 6.25 6.25 0 010 12.5z M16 16l4.5 4.5" size={15} stroke={C.textDim} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && load(1, search, roleF)}
            placeholder="Search by name or email…"
            style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px 9px 36px", color: C.text, fontSize: 13 }} />
        </div>
        <select value={roleF} onChange={e => { setRoleF(e.target.value); load(1, search, e.target.value); }}
          style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: 13 }}>
          <option value="">All Roles</option>
          {ROLE_OPTS.map(r => <option key={r} value={r}>{r.replace("_"," ")}</option>)}
        </select>
        <button onClick={() => load(1, search, roleF)} style={{ background: C.purple, color: "white", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600 }}>Search</button>
      </div>

      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>{total.toLocaleString()} users found</div>

      {/* Role-change modal */}
      {changing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="fade-up" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 28, width: 360 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Change Role</div>
            <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 20 }}>{changing.full_name}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {ROLE_OPTS.map(r => (
                <button key={r} onClick={() => changeRole(changing.id, r)}
                  style={{ padding: "11px 16px", borderRadius: 9, border: `2px solid ${changing.role === r ? ROLE_COL[r]||C.purple : C.border}`, background: changing.role === r ? (ROLE_COL[r]||C.purple)+"22" : "transparent", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, fontWeight: 600, color: ROLE_COL[r]||C.text, transition: "all 0.15s" }}>
                  <span style={{ textTransform: "capitalize" }}>{r.replace("_"," ")}</span>
                  {changing.role === r && <Svg d="M20 6L9 17l-5-5" size={14} stroke={ROLE_COL[r]||C.purple} sw={2.5} />}
                </button>
              ))}
            </div>
            <button onClick={() => setChanging(null)} style={{ width: "100%", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 0", fontSize: 13, color: C.textMuted, fontWeight: 600 }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 80px", padding: "10px 16px", borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          <span>User</span><span>Email</span><span>Role</span><span>Courses</span><span>Actions</span>
        </div>
        {loading && <div style={{ textAlign: "center", padding: 30, color: C.textMuted, fontSize: 13 }}>Loading…</div>}
        {!loading && users.map((u, i) => {
          const col = ROLE_COL[u.role] || C.textMuted;
          return (
            <div key={u.id} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 80px", padding: "12px 16px", borderBottom: i < users.length-1 ? `1px solid ${C.border}` : "none", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <InitialsAvatar name={u.full_name} size={34} bg={u.avatar_color || getColor(u.full_name)} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{u.full_name}</div>
                  <div style={{ fontSize: 11, color: u.is_online ? C.green : C.textMuted }}>{u.is_online ? "Online" : "Offline"}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
              <div>
                <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, background: col+"22", color: col, fontWeight: 600, textTransform: "capitalize", whiteSpace: "nowrap" }}>
                  {u.role.replace("_"," ")}
                </span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{u.course_count}</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setChanging(u)} title="Change role"
                  style={{ padding: 6, borderRadius: 6, background: C.purpleBg, border: `1px solid ${C.purple}44`, color: C.purpleLight }}
                  onMouseEnter={e => e.currentTarget.style.background=C.purpleBg} onMouseLeave={e => e.currentTarget.style.background=C.purpleBg}>
                  <Svg d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" size={13} stroke={C.purpleLight} />
                </button>
                <button onClick={() => deleteUser(u)} title="Delete user"
                  style={{ padding: 6, borderRadius: 6, background: C.white10, border: `1px solid ${C.border}`, color: C.textMuted, transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.background=C.redBg; e.currentTarget.style.borderColor=C.red; e.currentTarget.style.color=C.red; }}
                  onMouseLeave={e => { e.currentTarget.style.background=C.white10; e.currentTarget.style.borderColor=C.border; e.currentTarget.style.color=C.textMuted; }}>
                  <Svg d={["M3 6h18","M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"]} size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 16 }}>
          <button disabled={page <= 1} onClick={() => load(page-1)} style={{ padding: "6px 14px", borderRadius: 7, background: C.card, border: `1px solid ${C.border}`, color: C.textMuted, fontSize: 13, opacity: page<=1?0.4:1 }}>← Prev</button>
          <span style={{ padding: "6px 14px", fontSize: 13, color: C.textMuted }}>Page {page} of {pages}</span>
          <button disabled={page >= pages} onClick={() => load(page+1)} style={{ padding: "6px 14px", borderRadius: 7, background: C.card, border: `1px solid ${C.border}`, color: C.textMuted, fontSize: 13, opacity: page>=pages?0.4:1 }}>Next →</button>
        </div>
      )}
    </div>
  );
}

/* ─── ADMIN ALL COURSES ───────────────────────────────────────────────────────── */
function AdminCoursesView({ triggerCreate = 0 }) {
  const toast = useToast();
  const [courses, setCourses] = useState([]);
  const [search, setSearch]   = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName]   = useState("");
  const [newCode, setNewCode]   = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");
  const COLORS = ["#3b82f6","#7c3aed","#22c55e","#f97316","#06b6d4","#eab308","#ef4444","#ec4899"];

  const load = (s = search) => {
    const q = s ? `?search=${encodeURIComponent(s)}` : "";
    api(`/api/admin/courses${q}`).then(d => { if (Array.isArray(d)) setCourses(d); }).catch(() => {});
  };
  useEffect(() => { load(""); }, []);
  useEffect(() => { if (triggerCreate > 0) setCreating(true); }, [triggerCreate]);

  const createCourse = async () => {
    if (!newName.trim() || !newCode.trim()) { toast("Name and code required", "error"); return; }
    try {
      const res = await api("/api/courses", { method: "POST", body: { name: newName, code: newCode.toUpperCase(), color: newColor } });
      if (res.error) { toast(res.error, "error"); return; }
      toast(`Course "${newName}" created!`, "success");
      setCreating(false); setNewName(""); setNewCode(""); setNewColor("#3b82f6");
      load("");
    } catch { toast("Failed", "error"); }
  };

  const deleteCourse = async (c) => {
    if (!window.confirm(`Delete "${c.name}"? This will remove all messages and members.`)) return;
    try {
      await api(`/api/admin/courses/${c.id}`, { method: "DELETE" });
      setCourses(p => p.filter(x => x.id !== c.id));
      toast("Course deleted", "success");
    } catch { toast("Failed", "error"); }
  };

  const totalStudents = courses.reduce((s, c) => s + (parseInt(c.student_count)||0), 0);

  return (
    <div className="fade-up" style={{ padding: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        {[["Total Courses", courses.length, C.blue],["Total Students", totalStudents, C.green],["Total Messages", courses.reduce((s,c)=>s+(parseInt(c.message_count)||0),0), C.purple]].map(([l,v,c]) => (
          <div key={l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 18px" }}>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 3 }}>{l}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: c }}>{v.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Svg d="M11 17.25a6.25 6.25 0 110-12.5 6.25 6.25 0 010 12.5z M16 16l4.5 4.5" size={15} stroke={C.textDim} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && load(search)}
            placeholder="Search courses by name or code…"
            style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px 9px 36px", color: C.text, fontSize: 13 }} />
        </div>
        <button onClick={() => load(search)} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 16px", fontSize: 13, color: C.textMuted }}>Search</button>
        <button onClick={() => setCreating(true)} style={{ background: C.purple, color: "white", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
          <Svg d={["M12 5v14","M5 12h14"]} size={13} stroke="white" sw={2} /> Add Course
        </button>
      </div>

      {/* Create modal */}
      {creating && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="fade-up" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 440 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Add New Course</div>
              <button onClick={() => setCreating(false)} style={{ color: C.textMuted }}><Svg d={["M18 6L6 18","M6 6l12 12"]} size={18} /></button>
            </div>
            {[["Course Name","e.g. Data Structures",newName,v=>setNewName(v)],["Course Code","e.g. CS201",newCode,v=>setNewCode(v.toUpperCase())]].map(([l,ph,val,set]) => (
              <div key={l} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 5 }}>{l}</label>
                <input value={val} onChange={e => set(e.target.value)} placeholder={ph}
                  style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13 }}
                  onFocus={e => e.target.style.borderColor=C.purple} onBlur={e => e.target.style.borderColor=C.border} />
              </div>
            ))}
            <div style={{ marginBottom: 22 }}>
              <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 8 }}>Color</label>
              <div style={{ display: "flex", gap: 8 }}>{COLORS.map(col => <button key={col} onClick={()=>setNewColor(col)} style={{ width:28, height:28, borderRadius:"50%", background:col, border:`3px solid ${newColor===col?"white":"transparent"}`, outline:newColor===col?`2px solid ${col}`:"none" }} />)}</div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={()=>setCreating(false)} style={{ flex:1, background:"transparent", border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 0", fontSize:13, fontWeight:600, color:C.textMuted }}>Cancel</button>
              <button onClick={createCourse} style={{ flex:2, background:C.purple, color:"white", borderRadius:8, padding:"10px 0", fontSize:13, fontWeight:700 }}>Create</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {courses.map(c => (
          <div key={c.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 11, padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: (c.color||C.blue)+"22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Svg d="M4 19.5A2.5 2.5 0 016.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" size={18} stroke={c.color||C.blue} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                <div style={{ fontSize: 11, color: c.color||C.blue, fontWeight: 600 }}>{c.code}</div>
              </div>
              <button onClick={() => deleteCourse(c)} style={{ padding: 5, borderRadius: 6, color: C.textMuted, transition: "color 0.15s" }}
                onMouseEnter={e=>e.currentTarget.style.color=C.red} onMouseLeave={e=>e.currentTarget.style.color=C.textMuted}>
                <Svg d={["M3 6h18","M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"]} size={14} />
              </button>
            </div>
            {c.instructor_name && <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10 }}>👨‍🏫 {c.instructor_name}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              {[["Students",parseInt(c.student_count)||0,C.green],["Messages",parseInt(c.message_count)||0,C.blue],["Instructors",parseInt(c.instructor_count)||0,C.purple]].map(([l,v,col]) => (
                <div key={l} style={{ background: C.bg, borderRadius: 7, padding: "8px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: col }}>{v}</div>
                  <div style={{ fontSize: 10, color: C.textMuted }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── ADMIN CHAT MONITOR ──────────────────────────────────────────────────────── */
const OFFENSIVE_WORDS = ["offensive","spam","abuse","hate","kill","stupid","idiot","damn","wtf","shut up"];
const flagMessage = (text) => OFFENSIVE_WORDS.some(w => text.toLowerCase().includes(w));

function AdminChatMonitor() {
  const toast = useToast();
  const [messages, setMessages] = useState([]);
  const [total,    setTotal]    = useState(0);
  const [pages,    setPages]    = useState(1);
  const [page,     setPage]     = useState(1);
  const [search,   setSearch]   = useState("");
  const [channelF, setChannelF] = useState("");
  const [showFlagged, setShowFlagged] = useState(false);
  const [loading,  setLoading]  = useState(false);

  const load = async (pg=1, s=search, ch=channelF, flagged=showFlagged) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: 30, ...(s && {search:s}), ...(ch && {channel_type:ch}) });
      const d = await api(`/api/admin/messages?${params}`);
      if (d.messages) {
        let msgs = d.messages;
        if (flagged) msgs = msgs.filter(m => flagMessage(m.content));
        setMessages(msgs); setTotal(d.total); setPages(d.pages); setPage(pg);
      }
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(1,"","",false); }, []);

  const deleteMsg = async (id) => {
    try {
      await api(`/api/admin/messages/${id}`, { method: "DELETE" });
      setMessages(p => p.filter(m => m.id !== id));
      toast("Message deleted", "success");
    } catch { toast("Failed", "error"); }
  };

  const CH_COLORS = { course: C.blue, club: C.purple, team: C.green, direct: C.cyan };
  const flagged = messages.filter(m => flagMessage(m.content)).length;

  return (
    <div className="fade-up" style={{ padding: 20 }}>
      {/* Search bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
          <Svg d="M11 17.25a6.25 6.25 0 110-12.5 6.25 6.25 0 010 12.5z M16 16l4.5 4.5" size={15} stroke={C.textDim} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key==="Enter" && load(1,search,channelF,showFlagged)}
            placeholder="Search message content…"
            style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px 9px 36px", color: C.text, fontSize: 13 }} />
        </div>
        <select value={channelF} onChange={e => { setChannelF(e.target.value); load(1,search,e.target.value,showFlagged); }}
          style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: 13 }}>
          <option value="">All Channels</option>
          {["course","club","team","direct"].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
        </select>
        <button onClick={() => { const nf = !showFlagged; setShowFlagged(nf); load(1,search,channelF,nf); }}
          style={{ padding: "9px 16px", borderRadius: 8, background: showFlagged ? C.orangeBg : C.card, border: `1px solid ${showFlagged ? C.orange : C.border}`, color: showFlagged ? C.orange : C.textMuted, fontSize: 13, fontWeight: showFlagged ? 600 : 400, display: "flex", alignItems: "center", gap: 6 }}>
          🚩 Flagged {flagged > 0 && <span style={{ background: C.orange, color: "white", borderRadius: 99, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>{flagged}</span>}
        </button>
        <button onClick={() => load(1,search,channelF,showFlagged)} style={{ background: C.purple, color: "white", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600 }}>Search</button>
      </div>

      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>{total.toLocaleString()} messages · {flagged} flagged on this page</div>

      {loading && <div style={{ textAlign: "center", padding: 30, color: C.textMuted }}>Loading…</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.map(m => {
          const isFlagged = flagMessage(m.content);
          const chCol = CH_COLORS[m.channel_type] || C.textMuted;
          return (
            <div key={m.id} style={{ background: C.card, border: `1px solid ${isFlagged ? C.orange+"66" : C.border}`, borderRadius: 10, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
              <InitialsAvatar name={m.sender_name} size={36} bg={getColor(m.sender_name)} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{m.sender_name}</span>
                  <span style={{ fontSize: 11, color: C.textDim }}>{m.sender_email}</span>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: chCol+"22", color: chCol, fontWeight: 600, textTransform: "capitalize" }}>{m.channel_type}</span>
                  <span style={{ fontSize: 11, color: C.textMuted }}># {m.channel_name}</span>
                  {isFlagged && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: C.orangeBg, color: C.orange, fontWeight: 700 }}>🚩 Flagged</span>}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.55, wordBreak: "break-word", color: isFlagged ? C.orange : C.text }}>{m.content}</div>
                <div style={{ fontSize: 11, color: C.textDim, marginTop: 5 }}>{new Date(m.sent_at).toLocaleString()}</div>
              </div>
              <button onClick={() => deleteMsg(m.id)} title="Delete message"
                style={{ padding: 7, borderRadius: 7, background: C.white10, border: `1px solid ${C.border}`, flexShrink: 0, transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background=C.redBg; e.currentTarget.style.borderColor=C.red; }}
                onMouseLeave={e => { e.currentTarget.style.background=C.white10; e.currentTarget.style.borderColor=C.border; }}>
                <Svg d={["M3 6h18","M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"]} size={14} stroke={C.textMuted} />
              </button>
            </div>
          );
        })}
      </div>

      {pages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 16 }}>
          <button disabled={page<=1} onClick={()=>load(page-1)} style={{ padding:"6px 14px", borderRadius:7, background:C.card, border:`1px solid ${C.border}`, color:C.textMuted, fontSize:13, opacity:page<=1?0.4:1 }}>← Prev</button>
          <span style={{ padding:"6px 14px", fontSize:13, color:C.textMuted }}>Page {page} / {pages}</span>
          <button disabled={page>=pages} onClick={()=>load(page+1)} style={{ padding:"6px 14px", borderRadius:7, background:C.card, border:`1px solid ${C.border}`, color:C.textMuted, fontSize:13, opacity:page>=pages?0.4:1 }}>Next →</button>
        </div>
      )}
    </div>
  );
}

/* ─── INSTRUCTOR COURSES ──────────────────────────────────────────────────────── */
function InstructorCoursesView({ courses = [], triggerCreate = 0, onCoursesChange }) {
  const toast = useToast();
  const [selectedCourse, setSelected] = useState(null);
  const [tab, setTab]                 = useState("members"); // "members" | "materials"
  const [members, setMembers]         = useState([]);
  const [loadingM, setLoadingM]       = useState(false);
  // Materials state
  const [materials, setMaterials]     = useState([]);
  const [loadingMat, setLoadingMat]   = useState(false);
  const [addingMat, setAddingMat]     = useState(false);
  const [matTitle, setMatTitle]       = useState("");
  const [matType, setMatType]         = useState("link"); // "link" | "pdf"
  const [matUrl, setMatUrl]           = useState("");
  const [matDesc, setMatDesc]         = useState("");
  const [matFile, setMatFile]         = useState(null);
  const [uploading, setUploading]     = useState(false);
  const fileRef                       = useRef(null);
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [newCourseName, setNewCourseName]   = useState("");
  const [newCourseCode, setNewCourseCode]   = useState("");
  const [newCourseColor, setNewCourseColor] = useState("#3b82f6");
  const [newCourseDesc, setNewCourseDesc]   = useState("");
  const COURSE_COLORS = ["#3b82f6","#7c3aed","#22c55e","#f97316","#06b6d4","#eab308","#ef4444","#ec4899"];

  useEffect(() => { if (triggerCreate > 0) setCreatingCourse(true); }, [triggerCreate]);

  const submitNewCourse = async () => {
    if (!newCourseName.trim() || !newCourseCode.trim()) { toast("Name and code are required", "error"); return; }
    try {
      const res = await api("/api/courses", { method: "POST", body: { name: newCourseName, code: newCourseCode.toUpperCase(), color: newCourseColor, description: newCourseDesc } });
      if (res.error) { toast(res.error, "error"); return; }
      toast(`Course "${newCourseName}" created!`, "success");
      setCreatingCourse(false); setNewCourseName(""); setNewCourseCode(""); setNewCourseColor("#3b82f6"); setNewCourseDesc("");
      onCoursesChange?.();
    } catch { toast("Failed to create course", "error"); }
  };

  const totalStudents = courses.reduce((s, c) => s + (parseInt(c.student_count) || 0), 0);

  const openCourse = async (c) => {
    setSelected(c); setTab("members"); setLoadingM(true); setMembers([]); setMaterials([]);
    try { const d = await api(`/api/courses/${c.id}/members`); if (Array.isArray(d)) setMembers(d); }
    catch {}
    setLoadingM(false);
  };

  const loadMaterials = async (courseId) => {
    setLoadingMat(true);
    try { const d = await api(`/api/courses/${courseId}/materials`); if (Array.isArray(d)) setMaterials(d); }
    catch {}
    setLoadingMat(false);
  };

  const switchTab = (t) => {
    setTab(t);
    if (t === "materials" && selectedCourse) loadMaterials(selectedCourse.id);
  };

  const resetMatForm = () => { setMatTitle(""); setMatType("link"); setMatUrl(""); setMatDesc(""); setMatFile(null); if (fileRef.current) fileRef.current.value = ""; };

  const submitMaterial = async () => {
    if (!matTitle.trim()) { toast("Title is required", "error"); return; }
    if (matType === "link" && !matUrl.trim()) { toast("URL is required", "error"); return; }
    if (matType === "pdf" && !matFile && !matUrl.trim()) { toast("Select a file or paste a PDF URL", "error"); return; }
    setUploading(true);
    try {
      let res;
      if (matFile) {
        const fd = new FormData();
        fd.append("file", matFile);
        fd.append("title", matTitle);
        fd.append("type", "pdf");
        if (matDesc) fd.append("description", matDesc);
        const token = localStorage.getItem("token");
        const r = await fetch(`/api/courses/${selectedCourse.id}/materials`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        res = await r.json();
      } else {
        res = await api(`/api/courses/${selectedCourse.id}/materials`, {
          method: "POST",
          body: { title: matTitle, type: matType, url: matUrl, description: matDesc },
        });
      }
      if (res.error) { toast(res.error, "error"); setUploading(false); return; }
      toast("Material added!", "success");
      setAddingMat(false); resetMatForm(); loadMaterials(selectedCourse.id);
    } catch { toast("Failed to upload", "error"); }
    setUploading(false);
  };

  const deleteMaterial = async (mid) => {
    if (!window.confirm("Remove this material?")) return;
    try {
      await api(`/api/courses/${selectedCourse.id}/materials/${mid}`, { method: "DELETE" });
      setMaterials(p => p.filter(m => m.id !== mid));
      toast("Removed", "success");
    } catch { toast("Failed", "error"); }
  };

  const MatIcon = ({ type }) => {
    const isPdf = type === "pdf";
    return (
      <div style={{ width: 38, height: 38, borderRadius: 9, background: isPdf ? C.redBg : C.blueBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Svg d={isPdf ? ["M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z","M14 2v6h6","M9 15h6","M9 11h4"] : ["M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71","M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"]} size={17} stroke={isPdf ? C.red : C.blue} />
      </div>
    );
  };

  return (
    <div className="fade-up" style={{ padding: 20 }}>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        {[
          { l: "My Courses",     v: courses.length,  ic: "M4 19.5A2.5 2.5 0 016.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z", col: C.blue,   bg: C.blueBg },
          { l: "Total Students", v: totalStudents,   ic: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 7a4 4 0 100 8 4 4 0 000-8z",                       col: C.green,  bg: C.greenBg },
          { l: "Course Channels",v: courses.length,  ic: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",                                     col: C.purple, bg: C.purpleBg },
        ].map(s => (
          <div key={s.l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Svg d={s.ic} size={20} stroke={s.col} /></div>
            <div><div style={{ fontSize: 11, color: C.textMuted, marginBottom: 3 }}>{s.l}</div><div style={{ fontSize: 22, fontWeight: 800 }}>{s.v}</div></div>
          </div>
        ))}
      </div>

      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>My Courses</div>

      {/* Create Course Modal */}
      {creatingCourse && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="fade-up" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 440 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Create New Course</div>
              <button onClick={() => setCreatingCourse(false)} style={{ color: C.textMuted, padding: 4 }}><Svg d={["M18 6L6 18","M6 6l12 12"]} size={18} /></button>
            </div>
            {[["Course Name","e.g. Data Structures",newCourseName,v=>setNewCourseName(v)],["Course Code","e.g. CS201",newCourseCode,v=>setNewCourseCode(v.toUpperCase())]].map(([l,ph,val,set]) => (
              <div key={l} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 5 }}>{l}</label>
                <input value={val} onChange={e => set(e.target.value)} placeholder={ph}
                  style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13 }}
                  onFocus={e => e.target.style.borderColor = C.purple} onBlur={e => e.target.style.borderColor = C.border} />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 5 }}>Description (optional)</label>
              <input value={newCourseDesc} onChange={e => setNewCourseDesc(e.target.value)} placeholder="Brief course description…"
                style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13 }}
                onFocus={e => e.target.style.borderColor = C.purple} onBlur={e => e.target.style.borderColor = C.border} />
            </div>
            <div style={{ marginBottom: 22 }}>
              <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 8 }}>Color</label>
              <div style={{ display: "flex", gap: 8 }}>{COURSE_COLORS.map(col => <button key={col} onClick={() => setNewCourseColor(col)} style={{ width: 28, height: 28, borderRadius: "50%", background: col, border: `3px solid ${newCourseColor === col ? "white" : "transparent"}`, outline: newCourseColor === col ? `2px solid ${col}` : "none" }} />)}</div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setCreatingCourse(false)} style={{ flex: 1, background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 0", fontSize: 13, fontWeight: 600, color: C.textMuted }}>Cancel</button>
              <button onClick={submitNewCourse} style={{ flex: 2, background: C.purple, color: "white", borderRadius: 8, padding: "10px 0", fontSize: 13, fontWeight: 700 }}>Create Course</button>
            </div>
          </div>
        </div>
      )}

      {/* Course Modal */}
      {selectedCourse && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="fade-up" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 580, maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
            {/* Title */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17 }}>{selectedCourse.name}</div>
                <div style={{ fontSize: 12, color: selectedCourse.color || C.blue, fontWeight: 600, marginTop: 2 }}>{selectedCourse.code}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ color: C.textMuted, padding: 4 }}><Svg d={["M18 6L6 18","M6 6l12 12"]} size={18} /></button>
            </div>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 16, background: C.bg, borderRadius: 9, padding: 4 }}>
              {[["members","👥 Students"],["materials","📁 Materials"]].map(([t, l]) => (
                <button key={t} onClick={() => switchTab(t)} style={{ flex: 1, padding: "7px 0", borderRadius: 7, fontSize: 13, fontWeight: 600, background: tab === t ? C.card : "transparent", color: tab === t ? C.text : C.textMuted, border: tab === t ? `1px solid ${C.border}` : "1px solid transparent", transition: "all 0.15s" }}>{l}</button>
              ))}
            </div>

            {/* Members Tab */}
            {tab === "members" && (
              <>
                <div style={{ display: "flex", gap: 24, padding: "10px 0", borderBottom: `1px solid ${C.border}`, marginBottom: 12 }}>
                  {[["Members", members.length, C.blue],["Students", members.filter(m => m.role==="student").length, C.green],["Online", members.filter(m => m.is_online).length, C.cyan]].map(([l,v,c]) => (
                    <div key={l} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: c }}>{v}</div>
                      <div style={{ fontSize: 11, color: C.textMuted }}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ overflowY: "auto", flex: 1 }}>
                  {loadingM ? <div style={{ textAlign: "center", padding: 30, color: C.textMuted, fontSize: 13 }}>Loading…</div>
                  : members.length === 0 ? <div style={{ textAlign: "center", padding: 30, color: C.textMuted, fontSize: 13 }}>No members yet.</div>
                  : members.map(m => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                      <InitialsAvatar name={m.full_name} size={36} bg={m.avatar_color || getColor(m.full_name)} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{m.full_name}</div>
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>{m.email}</div>
                      </div>
                      <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 20, background: m.role==="instructor" ? C.purpleBg : C.blueBg, color: m.role==="instructor" ? C.purpleLight : C.blue, fontWeight: 600, textTransform: "capitalize" }}>{m.role}</span>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: m.is_online ? C.green : C.textDim, flexShrink: 0 }} />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Materials Tab */}
            {tab === "materials" && (
              <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 0 }}>
                {/* Add button */}
                {!addingMat && (
                  <button onClick={() => setAddingMat(true)} style={{ background: C.purple, color: "white", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, alignSelf: "flex-start", marginBottom: 14 }}>
                    <Svg d={["M12 5v14","M5 12h14"]} size={14} stroke="white" sw={2} /> Add Material
                  </button>
                )}

                {/* Add form */}
                {addingMat && (
                  <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Add Material</div>
                    {/* Type toggle */}
                    <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                      {[["link","🔗 Link"],["pdf","📄 PDF / File"]].map(([t,l]) => (
                        <button key={t} onClick={() => { setMatType(t); setMatFile(null); setMatUrl(""); if (fileRef.current) fileRef.current.value=""; }}
                          style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 13, fontWeight: 600, background: matType===t ? C.purple : C.card, color: matType===t ? "white" : C.textMuted, border: `1px solid ${matType===t ? C.purple : C.border}`, transition: "all 0.15s" }}>{l}</button>
                      ))}
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 5 }}>Title *</label>
                      <input value={matTitle} onChange={e => setMatTitle(e.target.value)} placeholder="e.g. Lecture 3 Slides"
                        style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: 13 }}
                        onFocus={e => e.target.style.borderColor=C.purple} onBlur={e => e.target.style.borderColor=C.border} />
                    </div>
                    {matType === "link" ? (
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 5 }}>URL *</label>
                        <input value={matUrl} onChange={e => setMatUrl(e.target.value)} placeholder="https://..."
                          style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: 13 }}
                          onFocus={e => e.target.style.borderColor=C.purple} onBlur={e => e.target.style.borderColor=C.border} />
                      </div>
                    ) : (
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 5 }}>Upload File (PDF, DOC, PPT…) or paste URL</label>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 10, background: C.card, border: `2px dashed ${C.border}`, borderRadius: 9, padding: "14px 16px", cursor: "pointer", transition: "border 0.15s" }}
                            onMouseEnter={e => e.currentTarget.style.borderColor=C.purple} onMouseLeave={e => e.currentTarget.style.borderColor=C.border}>
                            <Svg d={["M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4","M17 8l-5-5-5 5","M12 3v12"]} size={20} stroke={C.purple} />
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{matFile ? matFile.name : "Click to upload file"}</div>
                              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>PDF, DOC, PPT, XLS, images — max 20 MB</div>
                            </div>
                            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg" style={{ display: "none" }}
                              onChange={e => { setMatFile(e.target.files[0] || null); setMatUrl(""); }} />
                          </label>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ flex: 1, height: 1, background: C.border }} />
                            <span style={{ fontSize: 11, color: C.textDim }}>OR paste URL</span>
                            <div style={{ flex: 1, height: 1, background: C.border }} />
                          </div>
                          <input value={matUrl} onChange={e => { setMatUrl(e.target.value); setMatFile(null); if (fileRef.current) fileRef.current.value=""; }} placeholder="https://drive.google.com/..."
                            style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: 13 }}
                            onFocus={e => e.target.style.borderColor=C.purple} onBlur={e => e.target.style.borderColor=C.border} />
                        </div>
                      </div>
                    )}
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 5 }}>Description (optional)</label>
                      <input value={matDesc} onChange={e => setMatDesc(e.target.value)} placeholder="Brief description…"
                        style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: 13 }}
                        onFocus={e => e.target.style.borderColor=C.purple} onBlur={e => e.target.style.borderColor=C.border} />
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => { setAddingMat(false); resetMatForm(); }} style={{ flex: 1, background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 0", fontSize: 13, fontWeight: 600, color: C.textMuted }}>Cancel</button>
                      <button onClick={submitMaterial} disabled={uploading} style={{ flex: 2, background: C.purple, color: "white", borderRadius: 8, padding: "9px 0", fontSize: 13, fontWeight: 700, opacity: uploading ? 0.7 : 1 }}>{uploading ? "Uploading…" : "Add Material"}</button>
                    </div>
                  </div>
                )}

                {/* Materials list */}
                {loadingMat ? (
                  <div style={{ textAlign: "center", padding: 30, color: C.textMuted, fontSize: 13 }}>Loading materials…</div>
                ) : materials.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 30, color: C.textMuted, fontSize: 13 }}>No materials yet. Add a link or upload a file.</div>
                ) : materials.map(m => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
                    <MatIcon type={m.type} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <a href={m.url.startsWith("/uploads") ? `${window.location.origin}${m.url}` : m.url} target="_blank" rel="noreferrer"
                        style={{ fontSize: 13, fontWeight: 600, color: C.text, textDecoration: "none" }}
                        onMouseEnter={e => e.target.style.color=C.purple} onMouseLeave={e => e.target.style.color=C.text}>
                        {m.title}
                      </a>
                      {m.description && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{m.description}</div>}
                      <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{m.uploaded_by} · {new Date(m.created_at).toLocaleDateString()}</div>
                    </div>
                    <a href={m.url.startsWith("/uploads") ? `${window.location.origin}${m.url}` : m.url} target="_blank" rel="noreferrer"
                      style={{ padding: 6, borderRadius: 6, color: C.textMuted, display: "flex", alignItems: "center", textDecoration: "none" }}
                      onMouseEnter={e => e.currentTarget.style.color=C.blue} onMouseLeave={e => e.currentTarget.style.color=C.textMuted}>
                      <Svg d={["M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6","M15 3h6v6","M10 14L21 3"]} size={14} />
                    </a>
                    <button onClick={() => deleteMaterial(m.id)} style={{ padding: 6, borderRadius: 6, color: C.textMuted, transition: "color 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.color=C.red} onMouseLeave={e => e.currentTarget.style.color=C.textMuted}>
                      <Svg d={["M3 6h18","M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"]} size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Course Grid */}
      {courses.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: C.textMuted }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: C.purpleBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Svg d="M4 19.5A2.5 2.5 0 016.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" size={28} stroke={C.purpleLight} />
          </div>
          <div style={{ fontWeight: 600, marginBottom: 6, color: C.text, fontSize: 15 }}>No courses assigned</div>
          <div style={{ fontSize: 13 }}>Contact the admin to get a course assigned to you</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          {courses.map(c => (
            <div key={c.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: 11, background: (c.color || C.blue) + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Svg d="M4 19.5A2.5 2.5 0 016.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" size={20} stroke={c.color || C.blue} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: c.color || C.blue, fontWeight: 600, marginTop: 2 }}>{c.code}</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[["Students", parseInt(c.student_count)||0, C.green],["Messages", parseInt(c.message_count)||0, C.blue]].map(([l,v,col]) => (
                  <div key={l} style={{ background: C.bg, borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 3 }}>{l}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: col }}>{v}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => openCourse(c)} style={{ width: "100%", background: C.purpleBg, color: C.purpleLight, border: `1px solid ${C.purple}44`, borderRadius: 8, padding: "9px 0", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Svg d="M4 19.5A2.5 2.5 0 016.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" size={14} stroke={C.purpleLight} /> Manage Course
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── INSTRUCTOR ANNOUNCEMENTS ────────────────────────────────────────────────── */
function InstructorAnnouncementsView({ courses = [], triggerCreate = 0 }) {
  const toast = useToast();
  const [announcements, setAnnouncements] = useState([]);
  const [creating, setCreating]   = useState(false);
  const [aTitle, setATitle]       = useState("");
  const [aBody, setABody]         = useState("");
  const [aTag, setATag]           = useState("General");
  const [aCourseId, setACourseId] = useState("");
  const [aPinned, setAPinned]     = useState(false);
  const [saving, setSaving]       = useState(false);

  const load = () => {
    api("/api/announcements").then(d => { if (Array.isArray(d)) setAnnouncements(d); }).catch(() => {});
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (triggerCreate > 0) setCreating(true); }, [triggerCreate]);

  const resetForm = () => { setATitle(""); setABody(""); setATag("General"); setAPinned(false); setACourseId(""); };

  const save = async () => {
    if (!aTitle.trim() || !aBody.trim()) { toast("Title and message are required", "error"); return; }
    setSaving(true);
    try {
      const res = await api("/api/announcements", { method: "POST", body: { title: aTitle, body: aBody, tag: aTag, is_pinned: aPinned, course_id: aCourseId || null } });
      if (res.error) { toast(res.error, "error"); setSaving(false); return; }
      toast("Announcement posted!", "success");
      setCreating(false); resetForm(); load();
    } catch { toast("Failed to post announcement", "error"); }
    setSaving(false);
  };

  const togglePin = async (a) => {
    try {
      await api(`/api/announcements/${a.id}/pin`, { method: "PATCH" });
      setAnnouncements(p => p.map(x => x.id === a.id ? { ...x, is_pinned: !x.is_pinned } : x));
      toast(a.is_pinned ? "Unpinned" : "Pinned!", "success");
    } catch { toast("Failed", "error"); }
  };

  const del = async (id) => {
    try {
      await api(`/api/announcements/${id}`, { method: "DELETE" });
      setAnnouncements(p => p.filter(a => a.id !== id));
      toast("Deleted", "success");
    } catch { toast("Failed to delete", "error"); }
  };

  const ACard = ({ a }) => {
    const ts = TAG_STYLE[a.tag] || TAG_STYLE.General;
    const ageMs = Date.now() - new Date(a.created_at).getTime();
    const canDelete = ageMs <= 10 * 60 * 1000; // within 10 minutes
    return (
      <div style={{ background: C.card, border: `1px solid ${a.is_pinned ? C.yellow + "55" : C.border}`, borderRadius: 10, padding: 18, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: ts.bg, color: ts.color, fontWeight: 600 }}>{a.tag}</span>
              {a.is_pinned && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: C.yellowBg, color: C.yellow, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}><Svg d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" size={10} stroke={C.yellow} /> Pinned</span>}
              {a.course_code && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: C.blueBg, color: C.blue, fontWeight: 600 }}>{a.course_code}</span>}
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{a.title}</div>
            <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.7, marginBottom: 10 }}>{a.body}</p>
            <div style={{ fontSize: 11, color: C.textDim }}>{new Date(a.created_at).toLocaleString()}{a.created_by_name ? ` · ${a.created_by_name}` : ""}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
            <button onClick={() => togglePin(a)} title={a.is_pinned ? "Unpin" : "Pin"}
              style={{ padding: 8, borderRadius: 7, background: a.is_pinned ? C.yellowBg : C.white10, border: `1px solid ${a.is_pinned ? C.yellow + "66" : C.border}`, transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.yellow; }} onMouseLeave={e => { e.currentTarget.style.borderColor = a.is_pinned ? C.yellow + "66" : C.border; }}>
              <Svg d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" size={14} stroke={a.is_pinned ? C.yellow : C.textMuted} />
            </button>
            <button onClick={() => canDelete ? del(a.id) : toast("Cannot delete after 10 minutes", "warn")}
              title={canDelete ? "Delete" : "Cannot delete after 10 minutes"}
              style={{ padding: 8, borderRadius: 7, background: C.white10, border: `1px solid ${C.border}`, transition: "all 0.15s", opacity: canDelete ? 1 : 0.35, cursor: canDelete ? "pointer" : "not-allowed" }}
              onMouseEnter={e => { if (canDelete) { e.currentTarget.style.borderColor = C.red; e.currentTarget.style.background = C.redBg; } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.white10; }}>
              <Svg d={["M3 6h18","M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"]} size={14} stroke={canDelete ? C.textMuted : C.textDim} />
            </button>
            {!canDelete && <div style={{ fontSize: 9, color: C.textDim, textAlign: "center", lineHeight: 1.2 }}>locked</div>}
          </div>
        </div>
      </div>
    );
  };

  const pinned = announcements.filter(a => a.is_pinned);
  const rest   = announcements.filter(a => !a.is_pinned);

  return (
    <div className="fade-up" style={{ padding: 20, maxWidth: 860 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Announcements</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{announcements.length} total · {pinned.length} pinned</div>
        </div>
        <button onClick={() => setCreating(true)} style={{ background: C.purple, color: "white", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
          <Svg d={["M12 5v14","M5 12h14"]} size={14} stroke="white" sw={2} /> Post Announcement
        </button>
      </div>

      {/* Create Modal */}
      {creating && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="fade-up" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 560 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 17 }}>Post Announcement</div>
              <button onClick={() => { setCreating(false); resetForm(); }} style={{ color: C.textMuted, padding: 4 }}><Svg d={["M18 6L6 18","M6 6l12 12"]} size={18} /></button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 5 }}>Title *</label>
              <input value={aTitle} onChange={e => setATitle(e.target.value)} placeholder="Announcement title…" autoFocus
                style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13 }}
                onFocus={e => e.target.style.borderColor = C.purple} onBlur={e => e.target.style.borderColor = C.border} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 5 }}>Message *</label>
              <textarea value={aBody} onChange={e => setABody(e.target.value)} placeholder="Write your announcement…" rows={4}
                style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13, resize: "vertical", fontFamily: "inherit" }}
                onFocus={e => e.target.style.borderColor = C.purple} onBlur={e => e.target.style.borderColor = C.border} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 5 }}>Tag</label>
                <select value={aTag} onChange={e => setATag(e.target.value)} style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13 }}>
                  {["General","Important","Events","Academic","Technical"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 5 }}>Course (optional)</label>
                <select value={aCourseId} onChange={e => setACourseId(e.target.value)} style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13 }}>
                  <option value="">University-wide</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.code} – {c.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px" }}>
              <Toggle on={aPinned} onChange={setAPinned} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Pin this announcement</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>Pinned items appear at the top for all users</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setCreating(false); resetForm(); }} style={{ flex: 1, background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "11px 0", fontSize: 13, fontWeight: 600, color: C.textMuted }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ flex: 2, background: C.purple, color: "white", borderRadius: 8, padding: "11px 0", fontSize: 13, fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
                {saving ? "Posting…" : "Post Announcement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {announcements.length === 0 && <div style={{ textAlign: "center", padding: 60, color: C.textMuted, fontSize: 13 }}>No announcements yet. Post your first one!</div>}

      {pinned.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <Svg d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" size={14} stroke={C.yellow} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Pinned</span>
          </div>
          {pinned.map(a => <ACard key={a.id} a={a} />)}
          {rest.length > 0 && <div style={{ height: 1, background: C.border, margin: "18px 0 16px" }} />}
        </>
      )}
      {rest.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>All Announcements</div>
          {rest.map(a => <ACard key={a.id} a={a} />)}
        </>
      )}
    </div>
  );
}

/* ─── APP ────────────────────────────────────────────────────────────────────── */
function HeaderActionBtn({ label, onAction }) {
  return (
    <button onClick={() => onAction && onAction()} style={{ background: C.purple, color: "white", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
      <Svg d={["M12 5v14", "M5 12h14"]} size={14} stroke="white" sw={2} /> {label}
    </button>
  );
}

function CourseHeaderBtn({ label, icon, onClick, msg }) {
  const toast = useToast();
  return (
    <button onClick={() => onClick ? onClick() : msg && toast(msg, "info")} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.border}`, color: C.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
      <Svg d={icon} size={11} stroke={C.textMuted} /> {label}
    </button>
  );
}

function CoursePanelOverlay({ courseId, courseName, panel, onClose }) {
  const user      = useContext(UserContext);
  const canEdit   = user?.role === "instructor" || user?.role === "admin";
  const toast     = useToast();
  const [members,   setMembers]   = useState([]);
  const [materials, setMaterials] = useState([]);
  const [officeHrs, setOfficeHrs] = useState([]);
  const [loading,   setLoading]   = useState(true);
  // office-hours create form
  const [addingOH,    setAddingOH]    = useState(false);
  const [ohDate,      setOhDate]      = useState("");
  const [ohTime,      setOhTime]      = useState("14:00");
  const [ohDuration,  setOhDuration]  = useState(60);
  const [ohLocation,  setOhLocation]  = useState("");
  const [ohSaving,    setOhSaving]    = useState(false);

  const loadOH = () =>
    api(`/api/events?course_id=${courseId}&type=office_hours`)
      .then(d => { if (Array.isArray(d)) setOfficeHrs(d.sort((a,b) => new Date(a.start_time)-new Date(b.start_time))); })
      .catch(() => {});

  useEffect(() => {
    setLoading(true);
    if (panel === "members") {
      api(`/api/courses/${courseId}/members`).then(d => { if (Array.isArray(d)) setMembers(d); setLoading(false); }).catch(() => setLoading(false));
    } else if (panel === "materials") {
      api(`/api/courses/${courseId}/materials`).then(d => { if (Array.isArray(d)) setMaterials(d); setLoading(false); }).catch(() => setLoading(false));
    } else {
      loadOH().finally(() => setLoading(false));
    }
  }, [courseId, panel]);

  const createOH = async () => {
    if (!ohDate) { toast("Please pick a date", "error"); return; }
    setOhSaving(true);
    try {
      const start = new Date(`${ohDate}T${ohTime}:00`);
      const end   = new Date(start.getTime() + ohDuration * 60000);
      const title = `Office Hours — ${courseName}${ohLocation ? " · " + ohLocation : ""}`;
      const r = await api("/api/events", { method: "POST", body: { title, type: "office_hours", start_time: start.toISOString(), end_time: end.toISOString(), course_id: courseId } });
      if (r.error) { toast(r.error, "error"); } else { toast("Office hours added!", "success"); setAddingOH(false); setOhDate(""); setOhLocation(""); await loadOH(); }
    } catch { toast("Failed to create", "error"); }
    setOhSaving(false);
  };

  const PANEL_TITLES = { members: "Course Members", materials: "Course Materials", office_hours: "Office Hours" };

  const MatIcon = ({ type }) => {
    const isPdf = type === "pdf";
    return (
      <div style={{ width: 34, height: 34, borderRadius: 8, background: isPdf ? C.redBg : C.blueBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Svg d={isPdf ? ["M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z","M14 2v6h6","M9 15h6","M9 11h4"] : ["M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71","M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"]} size={15} stroke={isPdf ? C.red : C.blue} />
      </div>
    );
  };

  const now = new Date();
  const upcoming = officeHrs.filter(e => new Date(e.start_time) >= now);
  const past     = officeHrs.filter(e => new Date(e.start_time) <  now);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="fade-up" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 520, maxHeight: "82vh", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{PANEL_TITLES[panel]}</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{courseName}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {panel === "office_hours" && canEdit && (
              <button onClick={() => setAddingOH(p => !p)}
                style={{ background: C.purple, color: "white", borderRadius: 7, padding: "6px 14px", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                <Svg d="M12 5v14M5 12h14" size={12} stroke="white" /> Add Slot
              </button>
            )}
            <button onClick={onClose} style={{ color: C.textMuted, padding: 4 }}><Svg d={["M18 6L6 18","M6 6l12 12"]} size={18} /></button>
          </div>
        </div>

        {/* Office hours add form */}
        {panel === "office_hours" && addingOH && (
          <div style={{ background: C.bg, border: `1px solid ${C.purple}44`, borderRadius: 10, padding: 14, marginBottom: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <div>
                <label style={{ fontSize: 11, color: C.textMuted, display: "block", marginBottom: 4 }}>Date *</label>
                <input type="date" value={ohDate} onChange={e => setOhDate(e.target.value)}
                  style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 10px", color: C.text, fontSize: 13 }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.textMuted, display: "block", marginBottom: 4 }}>Time</label>
                <input type="time" value={ohTime} onChange={e => setOhTime(e.target.value)}
                  style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 10px", color: C.text, fontSize: 13 }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.textMuted, display: "block", marginBottom: 4 }}>Duration</label>
                <select value={ohDuration} onChange={e => setOhDuration(+e.target.value)}
                  style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 10px", color: C.text, fontSize: 13 }}>
                  {[30,60,90,120].map(d => <option key={d} value={d}>{d} min</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.textMuted, display: "block", marginBottom: 4 }}>Location (optional)</label>
                <input value={ohLocation} onChange={e => setOhLocation(e.target.value)} placeholder="e.g. Room B204"
                  style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 10px", color: C.text, fontSize: 13 }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={createOH} disabled={ohSaving}
                style={{ background: C.purple, color: "white", borderRadius: 7, padding: "7px 18px", fontSize: 13, fontWeight: 600, opacity: ohSaving ? 0.7 : 1 }}>
                {ohSaving ? "Saving…" : "Save"}
              </button>
              <button onClick={() => setAddingOH(false)} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 14px", fontSize: 13, color: C.textMuted }}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: C.textMuted, fontSize: 13 }}>Loading…</div>
          ) : panel === "members" ? (
            members.length === 0
              ? <div style={{ textAlign: "center", padding: 40, color: C.textMuted, fontSize: 13 }}>No members yet.</div>
              : members.map(m => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                  <InitialsAvatar name={m.full_name} size={36} bg={m.avatar_color || getColor(m.full_name)} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{m.full_name}</div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>{m.email}</div>
                  </div>
                  <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 20, background: m.role === "instructor" ? C.purpleBg : C.blueBg, color: m.role === "instructor" ? C.purpleLight : C.blue, fontWeight: 600, textTransform: "capitalize" }}>{m.role}</span>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: m.is_online ? C.green : C.textDim, flexShrink: 0 }} />
                </div>
              ))
          ) : panel === "materials" ? (
            materials.length === 0
              ? <div style={{ textAlign: "center", padding: 40, color: C.textMuted, fontSize: 13 }}>No materials uploaded yet.</div>
              : materials.map(m => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                  <MatIcon type={m.type} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <a href={m.url?.startsWith("/uploads") ? `${window.location.origin}${m.url}` : m.url} target="_blank" rel="noreferrer"
                      style={{ fontSize: 13, fontWeight: 600, color: C.text, textDecoration: "none" }}
                      onMouseEnter={e => e.target.style.color = C.purple} onMouseLeave={e => e.target.style.color = C.text}>
                      {m.title}
                    </a>
                    {m.description && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{m.description}</div>}
                    <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{new Date(m.created_at).toLocaleDateString()}</div>
                  </div>
                  <a href={m.url?.startsWith("/uploads") ? `${window.location.origin}${m.url}` : m.url} target="_blank" rel="noreferrer"
                    style={{ padding: 6, color: C.textMuted, display: "flex", alignItems: "center", textDecoration: "none" }}>
                    <Svg d={["M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6","M15 3h6v6","M10 14L21 3"]} size={14} />
                  </a>
                </div>
              ))
          ) : (
            /* Office Hours panel */
            officeHrs.length === 0 && !addingOH ? (
              <div style={{ textAlign: "center", padding: 40, color: C.textMuted, fontSize: 13 }}>
                {canEdit ? "No office hours scheduled yet. Click \"Add Slot\" to add one." : "No office hours scheduled yet."}
              </div>
            ) : (
              <>
                {upcoming.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Upcoming</div>
                    {upcoming.map(ev => {
                      const start = new Date(ev.start_time);
                      const end   = ev.end_time ? new Date(ev.end_time) : null;
                      const fmt   = d => d.toLocaleString("en-US", { weekday:"short", month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });
                      return (
                        <div key={ev.id} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: `1px solid ${C.border}`, alignItems: "flex-start" }}>
                          <div style={{ width: 46, height: 46, borderRadius: 10, background: C.cyanBg || C.purpleBg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <div style={{ fontSize: 10, color: C.cyan || C.purpleLight, fontWeight: 700, textTransform: "uppercase" }}>{start.toLocaleString("en-US",{month:"short"})}</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: C.cyan || C.purpleLight, lineHeight: 1 }}>{start.getDate()}</div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{fmt(start)}</div>
                            {end && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Until {end.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})} ({Math.round((end-start)/60000)} min)</div>}
                            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>by {ev.created_by_name}</div>
                          </div>
                          <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 20, background: C.greenBg, color: C.green, fontWeight: 700 }}>OPEN</span>
                        </div>
                      );
                    })}
                  </>
                )}
                {past.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 16, marginBottom: 8 }}>Past</div>
                    {past.slice(-5).reverse().map(ev => {
                      const start = new Date(ev.start_time);
                      return (
                        <div key={ev.id} style={{ display: "flex", gap: 14, padding: "10px 0", borderBottom: `1px solid ${C.border}`, alignItems: "center", opacity: 0.55 }}>
                          <div style={{ width: 46, height: 46, borderRadius: 10, background: C.white10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: "uppercase" }}>{start.toLocaleString("en-US",{month:"short"})}</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: C.textMuted, lineHeight: 1 }}>{start.getDate()}</div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, color: C.textMuted }}>{start.toLocaleString("en-US",{weekday:"short",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
                            <div style={{ fontSize: 11, color: C.textDim }}>by {ev.created_by_name}</div>
                          </div>
                          <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 20, background: C.white10, color: C.textDim, fontWeight: 700 }}>ENDED</span>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── CLUBS BROWSE ───────────────────────────────────────────────────────────── */
function ClubsBrowsePage({ onNav, onReload }) {
  const toast = useToast();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); try { const d = await api("/api/clubs"); if (Array.isArray(d)) setClubs(d); } catch {} setLoading(false); };
  useEffect(() => { load(); }, []);

  const requestJoin = async (club) => {
    try {
      const r = await api(`/api/clubs/${club.id}/join`, { method: "POST" });
      if (r.error) { toast(r.error, "error"); return; }
      toast("Join request sent! Wait for manager approval.", "success");
      load(); onReload?.();
    } catch { toast("Failed", "error"); }
  };
  const leave = async (club) => {
    if (!window.confirm(`Leave ${club.name}?`)) return;
    try { await api(`/api/clubs/${club.id}/leave`, { method: "DELETE" }); toast("Left club", "success"); load(); onReload?.(); }
    catch { toast("Failed", "error"); }
  };

  const StatusBtn = ({ club }) => {
    const s = club.my_status;
    if (s === "approved") return (
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={() => onNav(`club-${club.id}`)} style={{ flex: 2, background: C.purple, color: "white", borderRadius: 7, padding: "8px 0", fontSize: 12, fontWeight: 600 }}>Open Community</button>
        <button onClick={() => leave(club)} style={{ flex: 1, background: C.white10, color: C.textMuted, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 0", fontSize: 12 }}>Leave</button>
      </div>
    );
    if (s === "pending") return <button disabled style={{ width: "100%", background: C.yellowBg, color: C.yellow, border: `1px solid ${C.yellow}44`, borderRadius: 7, padding: "8px 0", fontSize: 12, fontWeight: 600 }}>⏳ Request Pending</button>;
    if (s === "rejected") return <button disabled style={{ width: "100%", background: C.redBg, color: C.red, border: `1px solid ${C.red}44`, borderRadius: 7, padding: "8px 0", fontSize: 12, fontWeight: 600, cursor: "default" }}>✗ Request Rejected</button>;
    return <button onClick={() => requestJoin(club)} style={{ width: "100%", background: C.purpleBg, color: C.purpleLight, border: `1px solid ${C.purple}44`, borderRadius: 7, padding: "8px 0", fontSize: 12, fontWeight: 600 }}>+ Request to Join</button>;
  };

  return (
    <div className="fade-up" style={{ padding: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Discover Clubs</div>
      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 20 }}>Find your community — request to join any club and get access to all its channels once approved</div>
      {loading ? <div style={{ textAlign: "center", padding: 60, color: C.textMuted }}>Loading clubs…</div> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {clubs.map(club => (
            <div key={club.id} style={{ background: C.card, border: `2px solid ${club.my_status === "approved" ? (club.color||C.purple)+"55" : C.border}`, borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: (club.color||C.purple)+"22", border: `2px solid ${club.color||C.purple}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: club.color||C.purple }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{club.name}</div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{parseInt(club.member_count)||0} members</div>
                </div>
                {club.my_status === "approved" && <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 20, background: C.greenBg, color: C.green, fontWeight: 700 }}>MEMBER</span>}
                {club.my_status === "approved" && club.my_role === "manager" && <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 20, background: C.purpleBg, color: C.purpleLight, fontWeight: 700 }}>MANAGER</span>}
              </div>
              {club.description && <p style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.6, margin: 0 }}>{club.description}</p>}
              <StatusBtn club={club} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── CLUB COMMUNITY VIEW ────────────────────────────────────────────────────── */
function ClubCommunityView({ clubId, onReloadClubs }) {
  const toast = useToast();
  const user = useContext(UserContext);
  const [clubInfo, setClubInfo]         = useState(null);
  const [channels, setChannels]         = useState([]);
  const [myStatus, setMyStatus]         = useState(null);
  const [myRole, setMyRole]             = useState(null);
  const [activeChannel, setActiveChannel] = useState(null);
  const [manageOpen, setManageOpen]     = useState(false);
  const [manageTab, setManageTab]       = useState("pending");
  const [members, setMembers]           = useState([]);
  const [generalPosts, setGeneralPosts] = useState([]);
  const [addingChannel, setAddingChannel] = useState(false);
  const [newChName, setNewChName]       = useState("");

  const loadClub = async () => {
    try {
      const allClubs = await api("/api/clubs");
      const found = Array.isArray(allClubs) ? allClubs.find(c => c.id === clubId) : null;
      if (found) setClubInfo(found);
      const r = await api(`/api/clubs/${clubId}/channels`);
      if (!r.error) {
        setChannels(r.channels || []);
        setMyStatus(r.my_status);
        setMyRole(r.my_role);
        if (r.my_status === "approved" && r.channels?.length) {
          setActiveChannel(prev => prev || r.channels[0].id);
        }
        if (r.my_status !== "approved") {
          const gp = await api(`/api/clubs/${clubId}/general-posts`);
          if (Array.isArray(gp)) setGeneralPosts(gp);
        }
      }
    } catch {}
  };
  const loadMembers = async () => {
    try { const d = await api(`/api/clubs/${clubId}/members`); if (Array.isArray(d)) setMembers(d); } catch {}
  };

  useEffect(() => { loadClub(); }, [clubId]);

  const requestJoin = async () => {
    try {
      const r = await api(`/api/clubs/${clubId}/join`, { method: "POST" });
      if (r.error) { toast(r.error, "error"); return; }
      toast("Request sent! A manager will review it soon.", "success");
      setMyStatus("pending");
    } catch { toast("Failed", "error"); }
  };

  const handleMember = async (uid, update) => {
    try {
      const r = await api(`/api/clubs/${clubId}/members/${uid}`, { method: "PATCH", body: update });
      if (r.error) { toast(r.error, "error"); return; }
      toast("Updated!", "success");
      loadMembers();
      if (update.status === "approved") { loadClub(); onReloadClubs?.(); }
    } catch { toast("Failed", "error"); }
  };

  const removeMember = async (uid) => {
    if (!window.confirm("Remove this member?")) return;
    try { await api(`/api/clubs/${clubId}/members/${uid}`, { method: "DELETE" }); toast("Removed", "success"); loadMembers(); }
    catch { toast("Failed", "error"); }
  };

  const addChannel = async () => {
    if (!newChName.trim()) return;
    try {
      const r = await api(`/api/clubs/${clubId}/channels`, { method: "POST", body: { name: newChName } });
      if (r.error) { toast(r.error, "error"); return; }
      toast(`#${r.name} created!`, "success");
      setNewChName(""); setAddingChannel(false); loadClub();
    } catch { toast("Failed", "error"); }
  };

  const deleteChannel = async (cid) => {
    if (!window.confirm("Delete this channel?")) return;
    try {
      await api(`/api/clubs/${clubId}/channels/${cid}`, { method: "DELETE" });
      toast("Deleted", "success"); if (activeChannel === cid) setActiveChannel(null); loadClub();
    } catch { toast("Failed", "error"); }
  };

  const isManager = ["manager","admin"].includes(myRole) || user?.role === "admin";
  const pending = members.filter(m => m.status === "pending");
  const approved = members.filter(m => m.status === "approved");

  if (!clubInfo) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: C.textMuted }}>Loading…</div>;

  // Non-member / pending view — show general posts only
  if (myStatus !== "approved") return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ padding: "14px 24px", borderBottom: `1px solid ${C.border}`, background: C.sidebar, display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: (clubInfo.color||C.purple)+"22", border: `2px solid ${clubInfo.color||C.purple}44`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 18, height: 18, borderRadius: 5, background: clubInfo.color||C.purple }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{clubInfo.name}</div>
          <div style={{ fontSize: 12, color: C.textMuted }}>{parseInt(clubInfo.member_count)||0} members</div>
        </div>
        {myStatus === "pending"
          ? <span style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8, background: C.yellowBg, color: C.yellow, fontWeight: 600 }}>⏳ Pending Approval</span>
          : <button onClick={requestJoin} style={{ background: C.purple, color: "white", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 600 }}>Request to Join</button>}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Svg d={["M22 17H2a3 3 0 000 6h1","M18 9a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9","M13.73 21a2 2 0 01-3.46 0"]} size={16} stroke={C.purple} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>General Announcements</span>
          </div>
          <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 20 }}>
            {myStatus === "pending" ? "Your request is pending. Once approved you'll get access to all club channels and discussions." : "Join this club to access all channels. General announcements are visible to everyone."}
          </p>
          {generalPosts.length === 0
            ? <div style={{ textAlign: "center", padding: 40, color: C.textMuted, fontSize: 13, background: C.card, borderRadius: 12, border: `1px solid ${C.border}` }}>No announcements yet.</div>
            : generalPosts.map(p => (
              <div key={p.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <InitialsAvatar name={p.sender_name} size={30} bg={p.avatar_color||getColor(p.sender_name)} />
                  <div><div style={{ fontSize: 13, fontWeight: 600 }}>{p.sender_name}</div><div style={{ fontSize: 11, color: C.textDim }}>{new Date(p.sent_at).toLocaleString()}</div></div>
                </div>
                <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6, margin: 0 }}>{p.content}</p>
              </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Member view
  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Left: channel list */}
      <div style={{ width: 220, background: C.sidebar, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "12px 12px 8px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: (clubInfo.color||C.purple)+"22", border: `2px solid ${clubInfo.color||C.purple}55`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: clubInfo.color||C.purple }} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{clubInfo.name}</div>
          </div>
          <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4, paddingLeft: 2 }}>{parseInt(clubInfo.member_count)||0} members · {isManager ? "Manager" : "Member"}</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px 4px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em", padding: "2px 8px 6px" }}>Channels</div>
          {channels.map(ch => (
            <button key={ch.id} onClick={() => { setActiveChannel(ch.id); setManageOpen(false); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 6, background: !manageOpen && activeChannel===ch.id ? C.purpleBg : "transparent", color: !manageOpen && activeChannel===ch.id ? C.purpleLight : C.textMuted, fontSize: 13, fontWeight: !manageOpen && activeChannel===ch.id ? 600 : 400, textAlign: "left", transition: "all 0.15s", marginBottom: 1 }}
              onMouseEnter={e => (manageOpen||activeChannel!==ch.id) && (e.currentTarget.style.background=C.white10)}
              onMouseLeave={e => (manageOpen||activeChannel!==ch.id) && (e.currentTarget.style.background="transparent")}>
              <span style={{ fontSize: 15, color: !manageOpen&&activeChannel===ch.id ? C.purpleLight : C.textDim }}>#</span>
              {ch.name}
              {ch.is_general && <span style={{ marginLeft: "auto", fontSize: 10 }}>📢</span>}
            </button>
          ))}
          {isManager && (
            addingChannel
              ? <div style={{ padding: "4px 6px" }}>
                  <input value={newChName} onChange={e=>setNewChName(e.target.value)} placeholder="channel-name" autoFocus
                    onKeyDown={e => { if(e.key==="Enter") addChannel(); if(e.key==="Escape") { setAddingChannel(false); setNewChName(""); } }}
                    style={{ width: "100%", background: C.card, border: `1px solid ${C.purple}`, borderRadius: 6, padding: "6px 8px", color: C.text, fontSize: 12 }} />
                  <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                    <button onClick={addChannel} style={{ flex: 1, background: C.purple, color: "white", borderRadius: 5, padding: "4px 0", fontSize: 11, fontWeight: 600 }}>Add</button>
                    <button onClick={() => { setAddingChannel(false); setNewChName(""); }} style={{ flex: 1, background: C.white10, color: C.textMuted, borderRadius: 5, padding: "4px 0", fontSize: 11 }}>Cancel</button>
                  </div>
                </div>
              : <button onClick={() => setAddingChannel(true)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 6, color: C.textDim, fontSize: 12, textAlign: "left" }}>
                  <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add Channel
                </button>
          )}
        </div>
        {isManager && (
          <button onClick={() => { setManageOpen(p=>!p); loadMembers(); }}
            style={{ margin: "6px 10px 10px", background: manageOpen ? C.purpleBg : C.white10, color: manageOpen ? C.purpleLight : C.textMuted, border: `1px solid ${manageOpen ? C.purple+"44" : C.border}`, borderRadius: 7, padding: "8px 0", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, transition: "all 0.15s" }}>
            <Svg d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" size={13} stroke={manageOpen ? C.purpleLight : C.textMuted} />
            Manage Club {pending.length > 0 && <span style={{ background: C.red, color: "white", borderRadius: 20, padding: "0 5px", fontSize: 10, fontWeight: 700 }}>{pending.length}</span>}
          </button>
        )}
      </div>

      {/* Right: manage panel or chat */}
      {manageOpen ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "10px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {[["pending",`Requests${pending.length ? ` (${pending.length})` : ""}`],["members","Members"],["channels","Channels"]].map(([t,l]) => (
              <button key={t} onClick={() => setManageTab(t)}
                style={{ padding: "7px 16px", borderRadius: 7, fontSize: 13, fontWeight: 600, background: manageTab===t ? C.purpleBg : "transparent", color: manageTab===t ? C.purpleLight : C.textMuted, border: `1px solid ${manageTab===t ? C.purple+"44" : "transparent"}`, transition: "all 0.15s" }}>{l}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
            {manageTab === "pending" && (
              pending.length === 0
                ? <div style={{ textAlign: "center", padding: 40, color: C.textMuted, fontSize: 13 }}>No pending requests 🎉</div>
                : pending.map(m => (
                  <div key={m.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
                    <InitialsAvatar name={m.full_name} size={38} bg={m.avatar_color||getColor(m.full_name)} />
                    <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{m.full_name}</div><div style={{ fontSize: 11, color: C.textMuted }}>{m.email}</div></div>
                    <button onClick={() => handleMember(m.id, { status: "approved" })} style={{ background: C.greenBg, color: C.green, border: `1px solid ${C.green}44`, borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 600 }}>✓ Approve</button>
                    <button onClick={() => handleMember(m.id, { status: "rejected" })} style={{ background: C.redBg, color: C.red, border: `1px solid ${C.red}44`, borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 600 }}>✗ Reject</button>
                  </div>
                ))
            )}
            {manageTab === "members" && (
              approved.length === 0
                ? <div style={{ textAlign: "center", padding: 40, color: C.textMuted, fontSize: 13 }}>No members yet.</div>
                : approved.map(m => (
                  <div key={m.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
                    <InitialsAvatar name={m.full_name} size={38} bg={m.avatar_color||getColor(m.full_name)} />
                    <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{m.full_name}</div><div style={{ fontSize: 11, color: C.textMuted }}>{m.email}</div></div>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: m.role==="manager" ? C.purpleBg : C.white10, color: m.role==="manager" ? C.purpleLight : C.textMuted, fontWeight: 600, textTransform: "capitalize" }}>{m.role}</span>
                    {m.role !== "manager"
                      ? <button onClick={() => handleMember(m.id, { role: "manager" })} style={{ background: C.purpleBg, color: C.purpleLight, border: `1px solid ${C.purple}44`, borderRadius: 7, padding: "6px 10px", fontSize: 11, fontWeight: 600 }}>↑ Make Manager</button>
                      : <button onClick={() => handleMember(m.id, { role: "member" })} style={{ background: C.white10, color: C.textMuted, border: `1px solid ${C.border}`, borderRadius: 7, padding: "6px 10px", fontSize: 11 }}>↓ Demote</button>}
                    <button onClick={() => removeMember(m.id)} style={{ padding: 6, borderRadius: 6, color: C.textMuted, transition: "color 0.15s" }} onMouseEnter={e=>e.currentTarget.style.color=C.red} onMouseLeave={e=>e.currentTarget.style.color=C.textMuted}>
                      <Svg d={["M3 6h18","M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"]} size={14} />
                    </button>
                  </div>
                ))
            )}
            {manageTab === "channels" && channels.map(ch => (
              <div key={ch.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: C.white10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: C.textMuted, flexShrink: 0 }}>#</div>
                <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>#{ch.name}</div>{ch.description && <div style={{ fontSize: 11, color: C.textMuted }}>{ch.description}</div>}{ch.is_general && <span style={{ fontSize: 10, color: C.yellow, fontWeight: 600 }}>📢 General — visible to non-members</span>}</div>
                {!ch.is_general && <button onClick={() => deleteChannel(ch.id)} style={{ padding: 7, borderRadius: 6, color: C.textMuted, transition: "color 0.15s" }} onMouseEnter={e=>e.currentTarget.style.color=C.red} onMouseLeave={e=>e.currentTarget.style.color=C.textMuted}><Svg d={["M3 6h18","M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"]} size={14} /></button>}
              </div>
            ))}
          </div>
        </div>
      ) : activeChannel ? (
        <ChatView key={activeChannel} channelType="club_channel" channelId={activeChannel}
          channelName={`# ${channels.find(c=>c.id===activeChannel)?.name || "channel"}`} isClub />
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, flexDirection: "column", gap: 10 }}>
          <Svg d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" size={36} stroke={C.textDim} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>Select a channel to start chatting</div>
        </div>
      )}
    </div>
  );
}

/* ─── ADMIN CLUBS ─────────────────────────────────────────────────────────────── */
function AdminClubsView({ triggerCreate = 0 }) {
  const toast = useToast();
  const [clubs, setClubs]       = useState([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName]   = useState("");
  const [newDesc, setNewDesc]   = useState("");
  const [newColor, setNewColor] = useState("#7c3aed");
  const [selected, setSelected] = useState(null); // club for manager assignment
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const COLORS = ["#3b82f6","#7c3aed","#22c55e","#f97316","#06b6d4","#eab308","#ef4444","#ec4899"];

  const load = async () => { try { const d = await api("/api/admin/clubs"); if (Array.isArray(d)) setClubs(d); } catch {} };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (triggerCreate > 0) setCreating(true); }, [triggerCreate]);

  const create = async () => {
    if (!newName.trim()) { toast("Name required", "error"); return; }
    try {
      const r = await api("/api/admin/clubs", { method: "POST", body: { name: newName, description: newDesc, color: newColor } });
      if (r.error) { toast(r.error, "error"); return; }
      toast(`Club "${newName}" created!`, "success");
      setCreating(false); setNewName(""); setNewDesc(""); load();
    } catch { toast("Failed", "error"); }
  };

  const deleteClub = async (c) => {
    if (!window.confirm(`Delete "${c.name}"? This removes all channels and members.`)) return;
    try { await api(`/api/admin/clubs/${c.id}`, { method: "DELETE" }); toast("Deleted", "success"); load(); }
    catch { toast("Failed", "error"); }
  };

  const searchUsers = async (q) => {
    setUserSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const r = await api(`/api/admin/users?search=${encodeURIComponent(q)}&limit=8`);
      if (r.users) setSearchResults(r.users);
    } catch {}
  };

  const assignManager = async (userId) => {
    try {
      const r = await api(`/api/admin/clubs/${selected.id}/assign-manager`, { method: "PATCH", body: { user_id: userId } });
      if (r.error) { toast(r.error, "error"); return; }
      toast("Manager assigned!", "success");
      setUserSearch(""); setSearchResults([]); load();
    } catch { toast("Failed", "error"); }
  };

  const removeManager = async (clubId, uid) => {
    try {
      await api(`/api/admin/clubs/${clubId}/managers/${uid}`, { method: "DELETE" });
      toast("Manager removed", "success"); load();
    } catch { toast("Failed", "error"); }
  };

  return (
    <div className="fade-up" style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div><div style={{ fontWeight: 700, fontSize: 15 }}>Club Management</div><div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{clubs.length} clubs on platform</div></div>
        <button onClick={() => setCreating(true)} style={{ background: C.purple, color: "white", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
          <Svg d={["M12 5v14","M5 12h14"]} size={14} stroke="white" sw={2} /> Create Club
        </button>
      </div>

      {/* Create modal */}
      {creating && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="fade-up" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 480 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <div style={{ fontWeight: 700, fontSize: 17 }}>Create New Club</div>
              <button onClick={() => setCreating(false)} style={{ color: C.textMuted, padding: 4 }}><Svg d={["M18 6L6 18","M6 6l12 12"]} size={18} /></button>
            </div>
            <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 5 }}>Club Name *</label><input value={newName} onChange={e=>setNewName(e.target.value)} autoFocus placeholder="e.g. Photography Club" style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13 }} onFocus={e=>e.target.style.borderColor=C.purple} onBlur={e=>e.target.style.borderColor=C.border} /></div>
            <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 5 }}>Description</label><textarea value={newDesc} onChange={e=>setNewDesc(e.target.value)} placeholder="What is this club about?" rows={2} style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13, resize: "vertical", fontFamily: "inherit" }} onFocus={e=>e.target.style.borderColor=C.purple} onBlur={e=>e.target.style.borderColor=C.border} /></div>
            <div style={{ marginBottom: 24 }}><label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 8 }}>Club Color</label><div style={{ display: "flex", gap: 8 }}>{COLORS.map(col => <button key={col} onClick={()=>setNewColor(col)} style={{ width: 28, height: 28, borderRadius: "50%", background: col, border: `3px solid ${newColor===col ? "white" : "transparent"}`, outline: newColor===col ? `2px solid ${col}` : "none", transition: "all 0.15s" }} />)}</div></div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setCreating(false)} style={{ flex: 1, background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "11px 0", fontSize: 13, fontWeight: 600, color: C.textMuted }}>Cancel</button>
              <button onClick={create} style={{ flex: 2, background: C.purple, color: "white", borderRadius: 8, padding: "11px 0", fontSize: 13, fontWeight: 700 }}>Create Club</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Manager modal */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={e=>e.target===e.currentTarget&&setSelected(null)}>
          <div className="fade-up" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 480 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Manage Managers — {selected.name}</div>
              <button onClick={() => { setSelected(null); setUserSearch(""); setSearchResults([]); }} style={{ color: C.textMuted, padding: 4 }}><Svg d={["M18 6L6 18","M6 6l12 12"]} size={18} /></button>
            </div>
            {/* Current managers */}
            {selected.managers?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8, fontWeight: 600 }}>Current Managers</div>
                {selected.managers.map(m => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                    <InitialsAvatar name={m.name} size={30} bg={getColor(m.name)} />
                    <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div><div style={{ fontSize: 11, color: C.textMuted }}>{m.email}</div></div>
                    <button onClick={() => removeManager(selected.id, m.id)} style={{ fontSize: 11, color: C.red, padding: "4px 8px", borderRadius: 6, border: `1px solid ${C.red}44`, background: C.redBg }}>Remove</button>
                  </div>
                ))}
              </div>
            )}
            {/* Search + assign */}
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8, fontWeight: 600 }}>Assign New Manager</div>
            <input value={userSearch} onChange={e => searchUsers(e.target.value)} placeholder="Search student by name or email…"
              style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13, marginBottom: 8 }}
              onFocus={e=>e.target.style.borderColor=C.purple} onBlur={e=>e.target.style.borderColor=C.border} />
            {searchResults.map(u => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: C.bg, marginBottom: 6 }}>
                <InitialsAvatar name={u.full_name} size={30} bg={getColor(u.full_name)} />
                <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{u.full_name}</div><div style={{ fontSize: 11, color: C.textMuted }}>{u.email}</div></div>
                <button onClick={() => assignManager(u.id)} style={{ background: C.purple, color: "white", borderRadius: 7, padding: "6px 14px", fontSize: 12, fontWeight: 600 }}>Assign</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clubs grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {clubs.map(c => (
          <div key={c.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 11, background: (c.color||C.purple)+"22", border: `2px solid ${c.color||C.purple}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <div style={{ width: 20, height: 20, borderRadius: 5, background: c.color||C.purple }} />
              </div>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>{c.description && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.description}</div>}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
              {[["Members", c.member_count||0, C.blue],["Pending", c.pending_count||0, C.yellow],["Channels", c.channel_count||0, C.green]].map(([l,v,col]) => (
                <div key={l} style={{ background: C.bg, borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: col }}>{v}</div>
                  <div style={{ fontSize: 10, color: C.textMuted }}>{l}</div>
                </div>
              ))}
            </div>
            {c.managers?.length > 0 && (
              <div style={{ marginBottom: 12, fontSize: 11, color: C.textMuted }}>
                👑 {c.managers.map(m=>m.name).join(", ")}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setSelected(c)} style={{ flex: 1, background: C.purpleBg, color: C.purpleLight, border: `1px solid ${C.purple}44`, borderRadius: 7, padding: "8px 0", fontSize: 12, fontWeight: 600 }}>👑 Managers</button>
              <button onClick={() => deleteClub(c)} style={{ flex: 1, background: C.redBg, color: C.red, border: `1px solid ${C.red}44`, borderRadius: 7, padding: "8px 0", fontSize: 12, fontWeight: 600 }}>🗑 Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── LEADERBOARD ────────────────────────────────────────────────────────────── */
function LeaderboardView() {
  const user = useContext(UserContext);
  const [data, setData] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [scope, setScope] = useState("global");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api(`/api/social/leaderboard?scope=${scope}`).then(d => {
      setData(d.leaderboard || []);
      setMyRank(d.my_rank);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [scope]);

  const medals = ["🥇","🥈","🥉"];
  return (
    <div style={{ padding: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          {myRank && <div style={{ fontSize: 13, color: C.textMuted }}>Your rank: <strong style={{ color: C.purple }}>#{myRank}</strong> out of {data.length}+</div>}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["global","course"].map(s => (
            <button key={s} onClick={() => setScope(s)} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${scope===s?C.purple:C.border}`, background: scope===s?C.purpleBg:"transparent", color: scope===s?C.purpleLight:C.textMuted, fontSize: 12, fontWeight: scope===s?600:400 }}>{s==="global"?"🌍 Global":"🎓 My Course"}</button>
          ))}
        </div>
      </div>
      {loading ? <div style={{ textAlign: "center", padding: 40, color: C.textMuted }}>Loading…</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.map((u, i) => {
            const isMe = u.id === user?.id;
            const rank = parseInt(u.rank);
            return (
              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 12, background: isMe ? C.purpleBg : C.card, border: `1px solid ${isMe ? C.purple : C.border}`, transition: "all 0.15s" }}>
                <div style={{ width: 32, textAlign: "center", fontSize: rank <= 3 ? 20 : 14, fontWeight: 700, color: rank<=3?undefined:C.textMuted }}>
                  {rank <= 3 ? medals[rank-1] : `#${rank}`}
                </div>
                <InitialsAvatar name={u.full_name} size={36} bg={u.avatar_color || C.purple} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: isMe ? 700 : 600, fontSize: 14, color: isMe ? C.purpleLight : C.text }}>{u.full_name} {isMe && <span style={{ fontSize: 11, color: C.textMuted }}>(you)</span>}</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>{u.level_name}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: rank===1?C.yellow:rank===2?C.textMuted:rank===3?C.orange:C.text }}>{parseInt(u.total_xp).toLocaleString()} XP</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── DIRECT MESSAGES ────────────────────────────────────────────────────────── */
function DirectMessagesView() {
  const user = useContext(UserContext);
  const toast = useToast();
  const [convs, setConvs] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [searchUser, setSearchUser] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const loadConvs = () => api("/api/social/conversations").then(d => { if (Array.isArray(d)) setConvs(d); }).catch(() => {});
  useEffect(() => { loadConvs(); }, []);

  const startConv = async (otherId) => {
    const conv = await api("/api/social/conversations", { method: "POST", body: { other_id: otherId } });
    if (conv.id) { setActiveConv(conv.id); setSearchUser(""); setSearchResults([]); loadConvs(); }
  };

  const doSearch = async () => {
    if (!searchUser.trim()) return;
    const d = await api(`/api/admin/users?search=${encodeURIComponent(searchUser)}&limit=5`);
    setSearchResults((d.users || []).filter(u => u.id !== user?.id));
  };

  return (
    <div style={{ display: "flex", height: "100%" }}>
      {/* Left panel */}
      <div style={{ width: 280, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", background: C.sidebar }}>
        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>💬 Messages</div>
          <div style={{ display: "flex", gap: 6 }}>
            <input value={searchUser} onChange={e => setSearchUser(e.target.value)} onKeyDown={e => e.key==="Enter"&&doSearch()}
              placeholder="Search user to message…" style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 10px", color: C.text, fontSize: 12 }} />
            <button onClick={doSearch} style={{ background: C.purple, color: "white", borderRadius: 7, padding: "7px 10px" }}>
              <Svg d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" size={13} stroke="white" />
            </button>
          </div>
          {searchResults.length > 0 && (
            <div style={{ marginTop: 6, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
              {searchResults.map(u => (
                <button key={u.id} onClick={() => startConv(u.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", textAlign: "left", fontSize: 13 }}
                  onMouseEnter={e=>e.currentTarget.style.background=C.white10} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <InitialsAvatar name={u.full_name} size={26} bg={u.avatar_color||C.purple} />
                  <div><div style={{ fontWeight: 600 }}>{u.full_name}</div><div style={{ fontSize: 11, color: C.textMuted }}>{u.role}</div></div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {convs.length === 0 && <div style={{ padding: 16, color: C.textMuted, fontSize: 13 }}>No conversations yet. Search for a user above to start chatting!</div>}
          {convs.map(c => (
            <button key={c.id} onClick={() => setActiveConv(c.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", textAlign: "left", background: activeConv===c.id?C.purpleBg:"transparent", borderBottom: `1px solid ${C.border}` }}
              onMouseEnter={e=>{if(activeConv!==c.id)e.currentTarget.style.background=C.white10;}} onMouseLeave={e=>{if(activeConv!==c.id)e.currentTarget.style.background="transparent";}}>
              <div style={{ position: "relative" }}>
                <InitialsAvatar name={c.other_name} size={36} bg={c.other_color||C.purple} />
                {c.other_online && <div style={{ position: "absolute", bottom: 1, right: 1, width: 9, height: 9, borderRadius: "50%", background: C.green, border: `2px solid ${C.sidebar}` }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{c.other_name}</div>
                  {parseInt(c.unread) > 0 && <div style={{ background: C.purple, color: "white", borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>{c.unread}</div>}
                </div>
                <div style={{ fontSize: 11, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.last_message || "No messages yet"}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
      {/* Right panel */}
      <div style={{ flex: 1 }}>
        {activeConv ? <ChatView channelId={activeConv} channelName={convs.find(c=>c.id===activeConv)?.other_name||"Chat"} channelType="dm" /> : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
            <Svg d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" size={48} stroke={C.textDim} />
            <div style={{ fontSize: 16, fontWeight: 700 }}>Select a conversation</div>
            <div style={{ fontSize: 13, color: C.textMuted }}>Or search for someone to start a new chat</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── POMODORO TIMER ──────────────────────────────────────────────────────────── */
function PomodoroView() {
  const MODES = { work: { label: "Focus", mins: 25, color: "#7c3aed" }, short: { label: "Short Break", mins: 5, color: "#22c55e" }, long: { label: "Long Break", mins: 15, color: "#3b82f6" } };
  const [mode, setMode] = useState("work");
  const [secsLeft, setSecsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [totalFocus, setTotalFocus] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecsLeft(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            if (mode === "work") { setSessions(n => n+1); setTotalFocus(t => t + MODES.work.mins); }
            if (typeof Notification !== "undefined") new Notification("⏰ Timer Done!", { body: mode==="work"?"Time for a break!":"Back to work!" });
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else { clearInterval(intervalRef.current); }
    return () => clearInterval(intervalRef.current);
  }, [running, mode]);

  const switchMode = (m) => { setMode(m); setSecsLeft(MODES[m].mins * 60); setRunning(false); };
  const mins = Math.floor(secsLeft / 60);
  const secs = secsLeft % 60;
  const pct = secsLeft / (MODES[mode].mins * 60);
  const r = 90, circ = 2 * Math.PI * r;
  const col = MODES[mode].color;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 28 }}>
      <div style={{ fontSize: 13, color: C.textMuted, textAlign: "center" }}>🍅 {sessions} sessions · ⏱ {totalFocus} min focused today</div>
      <div style={{ display: "flex", gap: 8 }}>
        {Object.entries(MODES).map(([k, v]) => (
          <button key={k} onClick={() => switchMode(k)} style={{ padding: "7px 16px", borderRadius: 20, background: mode===k?col+"22":"transparent", border: `1px solid ${mode===k?col:C.border}`, color: mode===k?col:C.textMuted, fontSize: 13, fontWeight: mode===k?600:400 }}>{v.label}</button>
        ))}
      </div>
      <div style={{ position: "relative", width: 220, height: 220 }}>
        <svg width="220" height="220" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="110" cy="110" r={r} fill="none" stroke={C.border} strokeWidth="10" />
          <circle cx="110" cy="110" r={r} fill="none" stroke={col} strokeWidth="10" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} style={{ transition: "stroke-dashoffset 0.5s" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 48, fontWeight: 800, color: C.text, fontFamily: "monospace" }}>{String(mins).padStart(2,"0")}:{String(secs).padStart(2,"0")}</div>
          <div style={{ fontSize: 13, color: col, fontWeight: 600 }}>{MODES[mode].label}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={() => setRunning(r => !r)} style={{ background: col, color: "white", borderRadius: 12, padding: "12px 32px", fontSize: 16, fontWeight: 700, minWidth: 120 }}>{running?"⏸ Pause":"▶ Start"}</button>
        <button onClick={() => { setSecsLeft(MODES[mode].mins*60); setRunning(false); }} style={{ background: C.white10, color: C.textMuted, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 20px", fontSize: 14 }}>↺ Reset</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 100px)", gap: 10, textAlign: "center" }}>
        {[["Sessions", sessions, C.purple], ["Focus min", totalFocus, C.green], ["Breaks", Math.max(0, sessions-1), C.blue]].map(([l,v,c]) => (
          <div key={l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 8px" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: c }}>{v}</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── GOALS ───────────────────────────────────────────────────────────────────── */
function GoalsView() {
  const toast = useToast();
  const [goals, setGoals] = useState([]);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState("");
  const [streak, setStreak] = useState(null);

  const load = async () => {
    const [g, s] = await Promise.all([api("/api/productivity/goals"), api("/api/productivity/streak")]);
    if (Array.isArray(g)) setGoals(g);
    if (s && !s.error) setStreak(s);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!title.trim()) { toast("Title required", "error"); return; }
    const r = await api("/api/productivity/goals", { method: "POST", body: { title, description: desc, target_date: date || undefined } });
    if (r.error) { toast(r.error, "error"); return; }
    toast("Goal added!", "success"); setAdding(false); setTitle(""); setDesc(""); setDate(""); load();
  };
  const complete = async (id) => {
    const r = await api(`/api/productivity/goals/${id}/complete`, { method: "PATCH" });
    if (r.error) { toast(r.error, "error"); return; }
    toast("🎯 Goal completed! XP earned!", "success"); load();
  };
  const del = async (id) => {
    await api(`/api/productivity/goals/${id}`, { method: "DELETE" }); load();
  };

  const active = goals.filter(g => !g.completed);
  const done   = goals.filter(g => g.completed);

  return (
    <div style={{ padding: 24 }}>
      {streak && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 20px", marginBottom: 20, display: "flex", gap: 24 }}>
          {[["🔥 Current Streak", `${streak.current_streak} days`, C.orange], ["🏆 Longest Streak", `${streak.longest_streak} days`, C.yellow], ["📅 Last Active", streak.last_activity_date ? new Date(streak.last_activity_date).toLocaleDateString() : "—", C.blue]].map(([l,v,c]) => (
            <div key={l}><div style={{ fontSize: 11, color: C.textMuted }}>{l}</div><div style={{ fontSize: 20, fontWeight: 700, color: c }}>{v}</div></div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>🎯 Semester Goals <span style={{ fontSize: 13, color: C.textMuted, fontWeight: 400 }}>({active.length} active)</span></div>
        <button onClick={() => setAdding(true)} style={{ background: C.purple, color: "white", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
          <Svg d={["M12 5v14","M5 12h14"]} size={13} stroke="white" sw={2} /> Add Goal
        </button>
      </div>

      {adding && (
        <div style={{ background: C.card, border: `1px solid ${C.purple}44`, borderRadius: 12, padding: 18, marginBottom: 16 }}>
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Goal title *" style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: 14, marginBottom: 8 }} />
          <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Description (optional)" style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: 13, marginBottom: 8 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: 13 }} />
            <button onClick={save} style={{ background: C.purple, color: "white", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 600 }}>Save</button>
            <button onClick={() => setAdding(false)} style={{ background: C.white10, color: C.textMuted, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 14px", fontSize: 13 }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {active.map(g => (
          <div key={g.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={() => complete(g.id)} style={{ width: 24, height: 24, borderRadius: 6, border: `2px solid ${C.purple}`, background: "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: "transparent" }} />
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{g.title}</div>
              {g.description && <div style={{ fontSize: 12, color: C.textMuted }}>{g.description}</div>}
              {g.target_date && <div style={{ fontSize: 11, color: C.blue, marginTop: 2 }}>📅 Due {new Date(g.target_date).toLocaleDateString()}</div>}
            </div>
            <div style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>+{g.xp_reward} XP</div>
            <button onClick={() => del(g.id)} style={{ color: C.textDim, padding: 4, borderRadius: 5 }} onMouseEnter={e=>e.currentTarget.style.color=C.red} onMouseLeave={e=>e.currentTarget.style.color=C.textDim}>
              <Svg d={["M3 6h18","M8 6V4h8v2","M19 6l-1 14H6L5 6"]} size={14} stroke="currentColor" />
            </button>
          </div>
        ))}
        {active.length === 0 && !adding && <div style={{ textAlign: "center", padding: "24px", color: C.textMuted, fontSize: 13 }}>No active goals. Add one to start earning XP!</div>}
        {done.length > 0 && (
          <>
            <div style={{ fontSize: 12, color: C.textDim, fontWeight: 600, marginTop: 8 }}>✅ COMPLETED</div>
            {done.map(g => (
              <div key={g.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14, opacity: 0.6 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: C.green+"22", border: `2px solid ${C.green}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Svg d="M20 6L9 17l-5-5" size={12} stroke={C.green} sw={2.5} />
                </div>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 14, textDecoration: "line-through" }}>{g.title}</div></div>
                <div style={{ fontSize: 11, color: C.green }}>+{g.xp_reward} XP earned</div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── GRADE TRACKER ───────────────────────────────────────────────────────────── */
function GradeTrackerView() {
  const user      = useContext(UserContext);
  const isStudent = user?.role === "student";
  const toast     = useToast();
  const [summary, setSummary]   = useState([]);
  const [grades, setGrades]     = useState([]);
  const [courses, setCourses]   = useState([]);
  const [selCourse, setSelCourse] = useState("");
  const [students, setStudents] = useState([]);
  const [adding, setAdding]     = useState(false);
  const [form, setForm]         = useState({ item_name: "", item_type: "assignment", score: "", max_score: "100", weight: "1", student_id: "" });

  const load = async () => {
    const [g, c] = await Promise.all([api("/api/academic/grades"), api("/api/courses")]);
    if (g && !g.error) { setGrades(g.grades || []); setSummary(g.summary || []); }
    if (Array.isArray(c)) setCourses(c);
  };
  useEffect(() => { load(); }, []);

  // When instructor selects a course, load its students
  useEffect(() => {
    if (!isStudent && selCourse) {
      api(`/api/courses/${selCourse}/members`)
        .then(d => setStudents(Array.isArray(d) ? d.filter(m => m.role === "student") : []))
        .catch(() => {});
    }
  }, [selCourse]);

  const save = async () => {
    if (!selCourse || !form.item_name || form.score === "") { toast("Fill all required fields", "error"); return; }
    if (!isStudent && !form.student_id) { toast("Select a student", "error"); return; }
    const r = await api("/api/academic/grades", { method: "POST", body: { ...form, course_id: selCourse, score: parseFloat(form.score), max_score: parseFloat(form.max_score), weight: parseFloat(form.weight) } });
    if (r.error) { toast(r.error, "error"); return; }
    toast("Grade saved!", "success");
    setAdding(false);
    setForm({ item_name: "", item_type: "assignment", score: "", max_score: "100", weight: "1", student_id: "" });
    load();
  };

  const letterGrade = (pct) => {
    if (pct >= 93) return ["A",  C.green];  if (pct >= 90) return ["A-", C.green];
    if (pct >= 87) return ["B+", C.blue];   if (pct >= 83) return ["B",  C.blue];  if (pct >= 80) return ["B-", C.blue];
    if (pct >= 77) return ["C+", C.yellow]; if (pct >= 73) return ["C",  C.yellow]; if (pct >= 70) return ["C-", C.yellow];
    return ["D/F", C.red];
  };

  return (
    <div style={{ padding: 24 }}>
      {/* Summary cards */}
      {summary.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
          {summary.map(c => {
            const pct = parseFloat(c.percentage);
            const [letter, col] = isNaN(pct) ? ["—", C.textMuted] : letterGrade(pct);
            return (
              <div key={c.code} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div><div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div><div style={{ fontSize: 11, color: C.textMuted }}>{c.code}</div></div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: col }}>{letter}</div>
                </div>
                <div style={{ background: C.bg, borderRadius: 6, height: 6, marginBottom: 4 }}>
                  <div style={{ background: col, borderRadius: 6, height: 6, width: `${Math.min(100, pct || 0)}%`, transition: "width 0.5s" }} />
                </div>
                <div style={{ fontSize: 11, color: C.textMuted }}>{isNaN(pct) ? "No grades yet" : `${pct}% · ${c.items.length} item(s)`}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{isStudent ? "My Grades" : "Student Grades"}</div>
        {!isStudent && (
          <button onClick={() => setAdding(true)} style={{ background: C.purple, color: "white", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
            <Svg d={["M12 5v14","M5 12h14"]} size={12} stroke="white" sw={2} /> Add Grade
          </button>
        )}
      </div>

      {/* Instructor add-grade form */}
      {!isStudent && adding && (
        <div style={{ background: C.card, border: `1px solid ${C.purple}44`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <select value={selCourse} onChange={e => { setSelCourse(e.target.value); setForm(f => ({ ...f, student_id: "" })); }}
              style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 10px", color: C.text, fontSize: 13 }}>
              <option value="">Select course *</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
            </select>
            <select value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}
              disabled={!selCourse || students.length === 0}
              style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 10px", color: C.text, fontSize: 13, opacity: selCourse ? 1 : 0.5 }}>
              <option value="">Select student *</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
            <select value={form.item_type} onChange={e => setForm(f => ({ ...f, item_type: e.target.value }))}
              style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 10px", color: C.text, fontSize: 13 }}>
              {["assignment","quiz","midterm","final","project","lab"].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
            <input value={form.item_name} onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} placeholder="Item name *"
              style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 10px", color: C.text, fontSize: 13 }} />
            {["score","max_score","weight"].map(k => (
              <input key={k} type="number" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                placeholder={k === "score" ? "Score *" : k === "max_score" ? "Max score" : "Weight"}
                style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 10px", color: C.text, fontSize: 13 }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={save} style={{ background: C.purple, color: "white", borderRadius: 7, padding: "8px 18px", fontSize: 13, fontWeight: 600 }}>Save</button>
            <button onClick={() => setAdding(false)} style={{ background: C.white10, color: C.textMuted, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 14px", fontSize: 13 }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Grade list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {grades.map(g => {
          const pct = parseFloat(g.score) / parseFloat(g.max_score) * 100;
          const [letter, col] = letterGrade(pct);
          return (
            <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: g.course_color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{g.item_name}</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>
                  {g.course_name} · {g.item_type}
                  {!isStudent && g.student_name && <> · <span style={{ color: C.purpleLight }}>{g.student_name}</span></>}
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, color: col }}>{letter}</div>
              <div style={{ fontSize: 13, color: C.textMuted }}>{g.score}/{g.max_score}</div>
              {!isStudent && (
                <button onClick={() => api(`/api/academic/grades/${g.id}`, { method: "DELETE" }).then(load)}
                  style={{ color: C.textDim, padding: 4 }}
                  onMouseEnter={e => e.currentTarget.style.color = C.red}
                  onMouseLeave={e => e.currentTarget.style.color = C.textDim}>
                  <Svg d={["M3 6h18","M8 6V4h8v2","M19 6l-1 14H6L5 6"]} size={13} stroke="currentColor" />
                </button>
              )}
            </div>
          );
        })}
        {grades.length === 0 && !adding && (
          <div style={{ textAlign: "center", padding: 28, color: C.textMuted, fontSize: 13 }}>
            {isStudent ? "No grades have been entered for you yet." : "No grades yet. Click \"Add Grade\" to enter student grades."}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── ADMIN ANALYTICS ─────────────────────────────────────────────────────────── */
function AdminAnalyticsView() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [sysTitle, setSysTitle] = useState("");
  const [sysContent, setSysContent] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    api("/api/admin/analytics").then(d => { if (!d.error) setData(d); }).catch(() => {});
  }, []);

  const postSystem = async () => {
    if (!sysTitle.trim() || !sysContent.trim()) { toast("Title and content required", "error"); return; }
    setPosting(true);
    const r = await api("/api/admin/system-announcement", { method: "POST", body: { title: sysTitle, content: sysContent } });
    setPosting(false);
    if (r.error) { toast(r.error, "error"); return; }
    toast("📣 System announcement sent to all users!", "success");
    setSysTitle(""); setSysContent("");
  };

  const SimpleBarChart = ({ items, colorKey = "count", label = "count" }) => {
    if (!items?.length) return <div style={{ color: C.textMuted, fontSize: 12, padding: 12 }}>No data yet</div>;
    const max = Math.max(...items.map(i => parseInt(i[colorKey]) || 0)) || 1;
    return (
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80, padding: "4px 0" }}>
        {items.map((item, i) => {
          const h = Math.max(4, ((parseInt(item[colorKey])||0) / max) * 72);
          const k = item.week || item.day || item.name || i;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }} title={`${typeof k==="string"?k.slice(0,10):k}: ${item[colorKey]}`}>
              <div style={{ width: "100%", background: C.purple, borderRadius: "3px 3px 0 0", height: h, transition: "height 0.4s" }} />
              <div style={{ fontSize: 9, color: C.textDim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 28 }}>{typeof k==="string"?k.slice(5,10):k}</div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      {/* Charts row */}
      {data && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>👥 New Users (8 weeks)</div>
            <SimpleBarChart items={data.userGrowth} colorKey="count" />
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>💬 Messages (14 days)</div>
            <SimpleBarChart items={data.msgActivity} colorKey="count" />
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>⚡ XP Distribution</div>
            {data.xpDist && (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {[["No XP", data.xpDist.zero, C.textDim], ["Beginner 1–100", data.xpDist.beginner, C.blue], ["Inter. 101–500", data.xpDist.intermediate, C.green], ["Advanced 501–1k", data.xpDist.advanced, C.orange], ["Expert 1k+", data.xpDist.expert, C.yellow]].map(([l,v,c]) => {
                  const total = Object.values(data.xpDist).reduce((s,n)=>s+parseInt(n),0)||1;
                  const pct = Math.round(parseInt(v)/total*100);
                  return (
                    <div key={l} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{ width: 70, fontSize: 10, color: C.textMuted, flexShrink: 0 }}>{l}</div>
                      <div style={{ flex: 1, background: C.bg, borderRadius: 4, height: 8 }}>
                        <div style={{ width: `${pct}%`, height: 8, background: c, borderRadius: 4 }} />
                      </div>
                      <div style={{ width: 24, textAlign: "right", fontSize: 10, color: c, fontWeight: 600 }}>{v}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top courses + clubs */}
      {data && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>🏆 Top Active Courses</div>
            {data.topCourses?.map((c, i) => (
              <div key={c.code} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: (c.color||C.purple)+"22", border: `1px solid ${c.color||C.purple}44`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: c.color||C.purple }}>{i+1}</span>
                </div>
                <div style={{ flex: 1, fontSize: 13 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: C.blue, fontWeight: 600 }}>{c.message_count} msgs</div>
              </div>
            ))}
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>🏛️ Top Clubs by Members</div>
            {data.topClubs?.map((c, i) => (
              <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.color||C.purple, flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 13 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>{c.member_count} members</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System announcement */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>📣 Broadcast System Announcement</div>
        <input value={sysTitle} onChange={e=>setSysTitle(e.target.value)} placeholder="Title *" style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: 14, marginBottom: 8 }} />
        <textarea value={sysContent} onChange={e=>setSysContent(e.target.value)} placeholder="Message to all users *" rows={4} style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: 13, resize: "vertical", marginBottom: 12 }} />
        <button onClick={postSystem} disabled={posting} style={{ background: C.purple, color: "white", borderRadius: 8, padding: "10px 22px", fontSize: 13, fontWeight: 600, opacity: posting?0.7:1 }}>
          {posting ? "Sending…" : "📣 Send to All Users"}
        </button>
      </div>
    </div>
  );
}

/* ─── ADMIN AI MODEL MANAGER ──────────────────────────────────────────────────── */
function AdminAIView() {
  const toast = useToast();
  const [status, setStatus] = useState(null);
  const [pairs, setPairs] = useState([]);
  const [tab, setTab] = useState("status");
  const [q, setQ] = useState(""); const [a, setA] = useState(""); const [cat, setCat] = useState("general");
  const [indexing, setIndexing] = useState(false);

  const loadStatus = () => api("/api/ai/status").then(d => { if (!d.error) setStatus(d); });
  const loadPairs  = () => api("/api/ai/training-pairs").then(d => { if (Array.isArray(d)) setPairs(d); });

  useEffect(() => { loadStatus(); loadPairs(); }, []);

  const addPair = async () => {
    if (!q.trim() || !a.trim()) { toast("Question + answer required", "error"); return; }
    const r = await api("/api/ai/training-pairs", { method: "POST", body: { question: q, answer: a, category: cat } });
    if (r.error) { toast(r.error, "error"); return; }
    toast("Training pair added!", "success"); setQ(""); setA(""); loadPairs();
  };
  const delPair = async (id) => {
    await api(`/api/ai/training-pairs/${id}`, { method: "DELETE" }); loadPairs();
  };
  const reindex = async () => {
    setIndexing(true);
    const r = await api("/api/ai/reindex", { method: "POST" });
    setIndexing(false);
    if (r.error) { toast(r.error, "error"); return; }
    toast(`✅ Indexed: ${r.materials} materials, ${r.announcements} announcements, ${r.faq} FAQ`, "success");
    loadStatus();
  };

  const TABS = [["status","🤖 Status"],["train","📚 Training Data"],["setup","⚙️ Setup Guide"]];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: `1px solid ${C.border}`, paddingBottom: 12 }}>
        {TABS.map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding: "7px 16px", borderRadius: 8, background: tab===id?C.purpleBg:"transparent", border: `1px solid ${tab===id?C.purple:C.border}`, color: tab===id?C.purpleLight:C.textMuted, fontSize: 13, fontWeight: tab===id?600:400 }}>{label}</button>
        ))}
      </div>

      {/* STATUS TAB */}
      {tab === "status" && status && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", background: C.card, border: `1px solid ${status.ollama_running?C.green:C.red}`, borderRadius: 12 }}>
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: status.ollama_running?C.green:C.red, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{status.ollama_running ? "🟢 Ollama is Running" : "🔴 Ollama is NOT Running"}</div>
              <div style={{ fontSize: 12, color: C.textMuted }}>{status.ollama_running ? `Chat model: ${status.chat_model} · Embed model: ${status.embed_model}` : "Install Ollama and run: ollama serve"}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[["📦 Downloaded Models", status.models?.length || 0, C.blue], ["🔮 Embeddings Stored", status.embeddings, C.purple], ["📚 Training Pairs", status.training_pairs, C.green]].map(([l,v,c]) => (
              <div key={l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: c }}>{v}</div>
                <div style={{ fontSize: 12, color: C.textMuted }}>{l}</div>
              </div>
            ))}
          </div>
          {status.models?.length > 0 && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Downloaded Models</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {status.models.map(m => <div key={m} style={{ padding: "4px 10px", borderRadius: 6, background: C.purpleBg, color: C.purpleLight, fontSize: 12, fontWeight: 600 }}>{m}</div>)}
              </div>
            </div>
          )}
          <button onClick={reindex} disabled={!status.ollama_running || indexing} style={{ background: C.purple, color: "white", borderRadius: 10, padding: "11px 22px", fontSize: 13, fontWeight: 600, opacity: (!status.ollama_running||indexing)?0.5:1, width: "fit-content" }}>
            {indexing ? "⏳ Indexing…" : "🔄 Re-index All Documents (RAG)"}
          </button>
        </div>
      )}

      {/* TRAINING DATA TAB */}
      {tab === "train" && (
        <div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Add Training Q&A Pair</div>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Question" style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: 13, marginBottom: 8 }} />
            <textarea value={a} onChange={e=>setA(e.target.value)} rows={3} placeholder="Answer (can use markdown)" style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: 13, resize: "vertical", marginBottom: 8 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <select value={cat} onChange={e=>setCat(e.target.value)} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 10px", color: C.text, fontSize: 13 }}>
                {["general","academic","cs","math","platform","study","productivity","motivation"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={addPair} style={{ background: C.purple, color: "white", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600 }}>Add Pair</button>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pairs.map(p => (
              <div key={p.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{p.question}</div>
                  <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>{p.answer.slice(0, 120)}{p.answer.length>120?"…":""}</div>
                  <div style={{ fontSize: 10, color: C.purple, marginTop: 4, fontWeight: 600 }}>{p.category}</div>
                </div>
                <button onClick={() => delPair(p.id)} style={{ color: C.textDim, padding: 4, flexShrink: 0, alignSelf: "flex-start" }} onMouseEnter={e=>e.currentTarget.style.color=C.red} onMouseLeave={e=>e.currentTarget.style.color=C.textDim}>
                  <Svg d={["M3 6h18","M8 6V4h8v2","M19 6l-1 14H6L5 6"]} size={14} stroke="currentColor" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SETUP GUIDE TAB */}
      {tab === "setup" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            { step: "1", title: "Install Ollama", desc: "Download and install Ollama for Windows from:", link: "https://ollama.com/download" },
            { step: "2", title: "Download the AI models", desc: "After installation, open a terminal and run:", code: "ollama pull llama3.2:3b\nollama pull nomic-embed-text" },
            { step: "3", title: "Create the UniVerse AI model", desc: "In the backend folder, run:", code: `cd C:\\universe-app\\universe-backend\nollama create universe-ai -f UniVerseAI.Modelfile` },
            { step: "4", title: "Start Ollama", desc: "Ollama should start automatically. If not, run:", code: "ollama serve" },
            { step: "5", title: "Index your documents (RAG)", desc: "Come back to this panel and click 'Re-index All Documents' to embed your course materials and announcements into the AI's knowledge." },
          ].map(s => (
            <div key={s.step} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, display: "flex", gap: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: C.purpleBg, border: `1px solid ${C.purple}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: C.purpleLight, flexShrink: 0 }}>{s.step}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: C.textMuted, marginBottom: s.code?8:0 }}>{s.desc} {s.link && <a href={s.link} target="_blank" rel="noreferrer" style={{ color: C.blue }}>{s.link}</a>}</div>
                {s.code && <pre style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 12, fontFamily: "monospace", color: C.green, margin: 0 }}>{s.code}</pre>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("login");
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("student");
  const [active, setActive] = useState("home");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [courses, setCourses] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const [calendarTrigger, setCalendarTrigger] = useState(0);
  const [teamTrigger, setTeamTrigger] = useState(0);
  const [instrCourseTrigger, setInstrCourseTrigger] = useState(0);
  const [adminCourseTrigger, setAdminCourseTrigger] = useState(0);
  const [announceTrigger, setAnnounceTrigger] = useState(0);
  const [clubTrigger, setClubTrigger] = useState(0);
  const [showCoursePanel, setShowCoursePanel] = useState(null);

  // Apply chosen palette to the shared mutable object before every render
  Object.assign(C, THEMES[theme] || THEMES.dark);

  const loadUserData = useCallback(() => {
    api("/api/courses").then(d => { if (Array.isArray(d)) setCourses(d); }).catch(() => {});
    api("/api/clubs/mine").then(d => { if (Array.isArray(d)) setClubs(d); }).catch(() => {});
  }, []);

  // Push notification registration
  const setupPush = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
      const keyRes = await fetch("/api/push/vapid-public-key");
      const { publicKey } = await keyRes.json();
      const urlBase64ToUint8 = (base64String) => {
        const padding = "=".repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
        const rawData = window.atob(base64);
        return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
      };
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8(publicKey) });
      const token = localStorage.getItem("token");
      await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(sub) });
    } catch (e) { /* silently skip if push not supported */ }
  };

  const handleLogin = (u) => {
    setUser(u); setRole(u.role || "student"); setActive("home"); setScreen("app");
    loadUserData();
    setTimeout(setupPush, 1500); // setup push after login
  };
  const handleSignOut = () => {
    localStorage.removeItem("token"); setUser(null); setCourses([]); setClubs([]);
    setScreen("login"); setSettingsOpen(false);
  };
  const handleNav = (id) => {
    if (id === "login") { handleSignOut(); return; }
    if (id === "settings") { setSettingsOpen(true); return; }
    setSettingsOpen(false); setActive(id);
  };
  const handleThemeChange = (t) => {
    localStorage.setItem("theme", t);
    setTheme(t);
  };

  const isChat = (active.startsWith("course-") || active.startsWith("club-") || active === "messages") && !settingsOpen;
  const isFullHeight = isChat || active === "pomodoro";
  const activeCourse = active.startsWith("course-") ? courses.find(c => `course-${c.id}` === active) : null;
  const activeClubId = active.startsWith("club-") ? parseInt(active.replace("club-", "")) : null;

  const pageInfo = () => {
    if (settingsOpen) return ["Settings", "Manage your account and preferences", null];
    if (activeCourse) return [null, null, null];
    if (activeClubId) return [null, null, null];
    const map = {
      home: role === "admin" ? ["Admin Panel 🛡️", "Platform overview — users, courses, messages and more", null]
          : role === "instructor" ? ["Instructor Dashboard 🎓", "Overview of your courses, students, and announcements", null]
          : [`Welcome back, ${user?.full_name?.split(" ")[0] || "there"} 👋`, "Here's what's happening with your courses and clubs today", null],
      "admin-users":         ["User Management", "View all users, change roles, remove accounts", null],
      "admin-courses":       ["All Courses", "Browse, create and delete courses across the platform", <HeaderActionBtn key="ac" label="Add Course" onAction={() => setAdminCourseTrigger(t => t + 1)} />],
      "admin-announcements": ["Announcements", "Post, pin and manage university-wide announcements", <HeaderActionBtn key="pa" label="Post Announcement" onAction={() => setAnnounceTrigger(t => t + 1)} />],
      "admin-messages":      ["Chat Monitor", "Review all messages, flag offensive content and moderate chats", null],
      "admin-clubs":         ["Club Management", "Create clubs, assign managers and manage memberships", <HeaderActionBtn key="ccl" label="Create Club" onAction={() => setClubTrigger(t => t + 1)} />],
      "clubs-browse":        ["Discover Clubs", "Find your community — join clubs and connect with peers", null],
      "instructor-courses":       ["Course Management", "Create and manage your courses, view enrolled students", <HeaderActionBtn key="cc" label="Create Course" onAction={() => setInstrCourseTrigger(t => t + 1)} />],
      "instructor-announcements": ["Announcements", "Post, pin and manage announcements for your students", <HeaderActionBtn key="pa2" label="Post Announcement" onAction={() => setAnnounceTrigger(t => t + 1)} />],
      calendar: ["Calendar", role === "student" ? "View your scheduled lectures, exams, and course events" : "Manage your lectures, meetings, and events", role !== "student" ? <HeaderActionBtn key="ae" label="Add Event" onAction={() => setCalendarTrigger(t => t + 1)} /> : null],
      badges: ["Your Badges & Achievements", "Track your progress and unlock new achievements", null],
      findteam: ["Team Hub", "Find study partners and create teams based on skills and badges", <HeaderActionBtn key="ct" label="Create Team" onAction={() => setTeamTrigger(t => t + 1)} />],
      announcements: ["University Announcements", "Stay updated with the latest news and information from your university", null],
      messages:          [null, null, null],
      leaderboard:       ["🏆 Leaderboard", "Top students ranked by XP", null],
      pomodoro:          ["⏱️ Focus Timer", "Stay productive with Pomodoro technique", null],
      goals:             ["🎯 Semester Goals", "Set goals, track progress, earn XP", null],
      grades:            ["📝 Grade Tracker", role === "student" ? "View your grades entered by instructors" : "Enter and manage student grades for your courses", null],
      tasks:             ["Tasks", role === "student" ? "View tasks and assignments from your instructors" : "Assign tasks and deadlines to your course students", null],
      "admin-analytics": ["📊 Analytics", "Platform statistics, charts, and system announcements", null],
      "admin-ai":        ["🤖 AI Model Manager", "Configure UniVerse AI, manage training data, and index documents", null],
      ai:                ["AI Study Assistant", "Get help with homework, study plans, and course questions", null],
    };
    return map[active] || ["UniVerse", "University Portal", null];
  };

  const [title, subtitle, headerRight] = pageInfo();
  const showHeader = !isChat && title !== null && !settingsOpen;

  const renderContent = () => {
    if (settingsOpen) return null;
    if (activeCourse) return (
      <ChatView channelId={activeCourse.id} channelName={activeCourse.name} memberCount={24} onlineCount={8}
        headerRight={[
          <CourseHeaderBtn key="ma" label="Members" icon="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" onClick={() => setShowCoursePanel("members")} />,
          <CourseHeaderBtn key="mt" label="Materials" icon={["M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2", "M9 5a2 2 0 002 2h2a2 2 0 002-2", "M9 5a2 2 0 012-2h2a2 2 0 012 2"]} onClick={() => setShowCoursePanel("materials")} />,
          <CourseHeaderBtn key="oh" label="Office Hours" icon="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2" onClick={() => setShowCoursePanel("office_hours")} />,
          <button key="d" onClick={() => handleNav("announcements")} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.border}`, color: C.textMuted, display: "flex", alignItems: "center", gap: 4 }}><Svg d={["M22 17H2a3 3 0 000 6h1", "M18 9a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9", "M13.73 21a2 2 0 01-3.46 0"]} size={11} stroke={C.textMuted} /> Announcements</button>,
        ]} />
    );
    if (activeClubId) return <ClubCommunityView clubId={activeClubId} onReloadClubs={loadUserData} />;
    if (role === "admin" && active === "home")                return <AdminDashboard onNav={handleNav} />;
    if (role === "admin" && active === "admin-users")         return <AdminUsersView />;
    if (role === "admin" && active === "admin-courses")       return <AdminCoursesView triggerCreate={adminCourseTrigger} />;
    if (role === "admin" && active === "admin-announcements") return <InstructorAnnouncementsView courses={[]} triggerCreate={announceTrigger} />;
    if (role === "admin" && active === "admin-messages")      return <AdminChatMonitor />;
    if (role === "admin" && active === "admin-clubs")         return <AdminClubsView triggerCreate={clubTrigger} />;
    if (role === "instructor" && active === "home") return <InstructorHome courses={courses} onNav={handleNav} />;
    if (role === "instructor" && active === "instructor-courses") return <InstructorCoursesView courses={courses} triggerCreate={instrCourseTrigger} onCoursesChange={loadUserData} />;
    if (role === "instructor" && active === "instructor-announcements") return <InstructorAnnouncementsView courses={courses} triggerCreate={announceTrigger} />;
    const map = {
      "clubs-browse": <ClubsBrowsePage onNav={handleNav} onReload={loadUserData} />,
      home: <HomeDashboard onNav={handleNav} />,
      tasks: <TasksView />,
      calendar: <CalendarView triggerCreate={calendarTrigger} />,
      badges: <BadgesView />,
      findteam: <FindTeam triggerCreate={teamTrigger} />,
      announcements: <AnnouncementsView />,
      messages:         <DirectMessagesView />,
      leaderboard:      <LeaderboardView />,
      pomodoro:         <PomodoroView />,
      goals:            <GoalsView />,
      grades:           <GradeTrackerView />,
      "admin-analytics": <AdminAnalyticsView />,
      "admin-ai":        <AdminAIView />,
      ai:               <AIAssistant />,
    };
    return map[active] || <HomeDashboard onNav={handleNav} />;
  };

  return (
    <ToastProvider>
    <>
      <style>{getGlobalCSS(C)}</style>
      {screen === "login" ? <LoginScreen onLogin={handleLogin} /> : (
        <UserContext.Provider value={user}>
        <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
          <Sidebar active={settingsOpen ? "settings" : active} onNav={handleNav} role={role} user={user} courses={courses} clubs={clubs} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {showHeader && <Header title={title} subtitle={subtitle} right={headerRight} />}
            <div style={{ flex: 1, overflowY: isFullHeight ? "hidden" : "auto" }}>
              {renderContent()}
            </div>
          </div>

          {/* Course panel overlay (Members / Materials) */}
          {activeCourse && showCoursePanel && (
            <CoursePanelOverlay courseId={activeCourse.id} courseName={activeCourse.name} panel={showCoursePanel} onClose={() => setShowCoursePanel(null)} />
          )}

          {/* Settings side panel */}
          {settingsOpen && (
            <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex" }} onClick={e => e.target === e.currentTarget && setSettingsOpen(false)}>
              <div style={{ flex: 1 }} onClick={() => setSettingsOpen(false)} />
              <div style={{ width: 600, background: C.sidebar, borderLeft: `1px solid ${C.border}`, display: "flex", flexDirection: "column", overflowY: "auto" }}>
                <div style={{ padding: "16px 22px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                  <div><h2 style={{ fontSize: 18, fontWeight: 700 }}>Settings</h2><p style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>Manage your account and preferences</p></div>
                  <button onClick={() => setSettingsOpen(false)} style={{ color: C.textMuted, padding: 6 }}><Svg d={["M18 6L6 18", "M6 6l12 12"]} size={18} /></button>
                </div>
                <SettingsView onSignOut={handleSignOut} onThemeChange={handleThemeChange} />
              </div>
            </div>
          )}
        </div>
        </UserContext.Provider>
      )}
    </>
    </ToastProvider>
  );
}
