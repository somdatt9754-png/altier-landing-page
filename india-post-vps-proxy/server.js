import express from "express";

const app = express();
const PORT = Number(process.env.PORT || 8080);
const SHARED_SECRET = process.env.PROXY_SHARED_SECRET || "";
const INDIA_POST_ORIGIN = "https://test.cept.gov.in";
const MAX_BODY = "2mb";

app.disable("x-powered-by");
app.use(express.json({ limit: MAX_BODY }));

function fail(res, status, message) {
  return res.status(status).json({ success: false, message });
}

function authorized(req) {
  return Boolean(SHARED_SECRET) && req.get("x-india-post-proxy-key") === SHARED_SECRET;
}

function safePath(value) {
  if (typeof value !== "string" || !value.startsWith("/beextcustomer/")) return null;
  if (value.includes("\\") || value.includes("..")) return null;
  return value;
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "india-post-vps-proxy" });
});

app.post("/proxy", async (req, res) => {
  if (!authorized(req)) return fail(res, 401, "Unauthorized");

  const method = String(req.body?.method || "GET").toUpperCase();
  const path = safePath(req.body?.path);
  if (!path) return fail(res, 400, "Invalid India Post path");
  if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return fail(res, 400, "Unsupported method");
  }

  const url = `${INDIA_POST_ORIGIN}${path}`;
  const headers = {
    accept: req.body?.headers?.accept || "application/json",
  };

  for (const key of ["authorization", "content-type", "accept-language"]) {
    const value = req.body?.headers?.[key];
    if (typeof value === "string" && value.length <= 4096) headers[key] = value;
  }

  const init = { method, headers, signal: AbortSignal.timeout(20000) };
  if (method !== "GET" && method !== "HEAD") {
    init.body = JSON.stringify(req.body?.body ?? {});
    headers["content-type"] = "application/json";
  }

  try {
    const upstream = await fetch(url, init);
    const contentType = upstream.headers.get("content-type") || "application/json";
    const buffer = Buffer.from(await upstream.arrayBuffer());

    res.status(upstream.status);
    res.set("content-type", contentType);
    res.set("cache-control", "no-store");
    return res.send(buffer);
  } catch (error) {
    // Never log request bodies or authorization headers: India Post credentials/tokens
    // may be present in them.
    return fail(res, 502, `India Post upstream request failed: ${error?.message || String(error)}`);
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`India Post VPS proxy listening on ${PORT}`);
});
