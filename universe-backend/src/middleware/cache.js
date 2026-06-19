/**
 * Lightweight per-user in-memory cache with TTL.
 *
 * Usage:
 *   router.get("/", cache(300), ctrl.getThings);          // cache 5 min
 *   router.post("/", invalidateFor("things"), ctrl.add);  // bust on write
 *
 * Cache key: `${userId}:${tag}:${originalUrl}` so different users never
 * share entries, and tag-based invalidation is O(n) over the store size.
 */

const store = new Map();

// Prune expired entries every 5 minutes so memory doesn't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store) if (now >= v.exp) store.delete(k);
}, 300_000).unref();

/**
 * Express middleware that caches JSON responses for `ttl` seconds.
 * @param {number} ttl  Time-to-live in seconds.
 * @param {string} tag  Optional tag for targeted invalidation (defaults to first path segment).
 */
function cache(ttl, tag) {
  return (req, res, next) => {
    if (req.method !== "GET") return next();

    const uid = req.user?.id ?? "anon";
    const segment = tag || req.path.split("/")[1] || "misc";
    const key = `${uid}:${segment}:${req.originalUrl}`;

    const hit = store.get(key);
    if (hit && Date.now() < hit.exp) {
      res.setHeader("X-Cache", "HIT");
      return res.json(hit.data);
    }

    const originalJson = res.json.bind(res);
    res.json = (data) => {
      // Only cache successful responses
      if (res.statusCode < 300) {
        store.set(key, { data, exp: Date.now() + ttl * 1000 });
      }
      res.setHeader("X-Cache", "MISS");
      return originalJson(data);
    };

    next();
  };
}

/**
 * Express middleware that clears all cache entries for the current user
 * that match any of the given tags. Place it before the controller on
 * mutating routes (POST / PATCH / DELETE).
 * @param {...string} tags
 */
function invalidateFor(...tags) {
  return (req, res, next) => {
    const uid = req.user?.id ?? "anon";
    const prefixes = tags.map(t => `${uid}:${t}:`);
    for (const key of store.keys()) {
      if (prefixes.some(p => key.startsWith(p))) store.delete(key);
    }
    next();
  };
}

module.exports = { cache, invalidateFor };
