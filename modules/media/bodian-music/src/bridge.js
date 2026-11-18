  // ================= Egern → Surge API 桥 =================
  // 上游 bdyy.js 是 Surge/QuanX/Loon 三平台自动适配写法（$request/$response/$done/$httpClient），
  // Egern 只注入 ctx。这里把 ctx 映射成上游认识的那几个全局，让上游源码原样跑。
  const __eg_isReq = !!(ctx && ctx.request);
  const __eg_isResp = !!(ctx && ctx.response);
  const __eg_env = (ctx && ctx.env) || {};

  const __eg_headers = (h) => {
    const out = {};
    try {
      if (!h) return out;
      if (typeof h.forEach === "function" && !Array.isArray(h)) h.forEach((v, k) => { out[String(k).toLowerCase()] = v; });
      else for (const k of Object.keys(h)) out[String(k).toLowerCase()] = h[k];
    } catch (e) {}
    return out;
  };

  let __eg_request;
  if (__eg_isReq) {
    const r = ctx.request;
    // 不主动读 request.body：response 阶段读会把流消费掉
    __eg_request = {
      url: r.url,
      method: r.method || "GET",
      headers: __eg_headers(r.headers),
    };
  }

  let __eg_response;
  if (__eg_isResp) {
    const r = ctx.response;
    let body = "";
    try { body = await r.text(); } catch (e) { body = ""; }
    if (typeof body !== "string") body = "";
    const status = r.status || r.statusCode || 200;
    __eg_response = {
      status: status,
      statusCode: status,
      headers: __eg_headers(r.headers),
      body: body,
    };
  }

  const __eg_call = (method) => (opts, cb) => {
    (async () => {
      try {
        const o = typeof opts === "string" ? { url: opts } : (opts || {});
        const init = { headers: o.headers || {} };
        if (o.timeout) init.timeout = o.timeout * 1000 >= 1000 ? o.timeout : o.timeout * 1000;
        if (o.body !== undefined) init.body = o.body;
        const m = String(method).toUpperCase();
        const fn = (ctx.http && (ctx.http[m.toLowerCase()] || ctx.http.get)) || null;
        if (!fn) throw new Error("ctx.http unavailable");
        const resp = await fn.call(ctx.http, o.url, init);
        const text = await resp.text();
        const rh = __eg_headers(resp.headers);
        const status = resp.status || resp.statusCode || 200;
        const r = { status: status, statusCode: status, headers: rh, body: text };
        if (typeof cb === "function") cb(null, r, text);
      } catch (e) {
        if (typeof cb === "function") cb(e && e.message ? e.message : String(e), null, null);
      }
    })();
  };

  globalThis.$httpClient = {
    get: __eg_call("GET"), post: __eg_call("POST"), put: __eg_call("PUT"),
    delete: __eg_call("DELETE"), head: __eg_call("HEAD"), patch: __eg_call("PATCH"),
    options: __eg_call("OPTIONS"),
  };

  globalThis.$persistentStore = {
    read: (k) => { try { const v = ctx.storage.get(k); return v == null ? null : v; } catch (e) { return null; } },
    write: (v, k) => { try { ctx.storage.set(k, v == null ? "" : String(v)); return true; } catch (e) { return false; } },
  };

  const __eg_notify = (t, s, b) => {
    const title = t == null ? "" : String(t);
    const sub = s == null ? "" : String(s);
    const body = b == null ? "" : String(b);
    try { ctx.notify({ title: title, subtitle: sub, body: body }); }
    catch (e) {
      try { ctx.notify(title, sub ? sub + "\n" + body : body); } catch (e2) {}
    }
  };
  globalThis.$notification = { post: __eg_notify };
  globalThis.$notify = __eg_notify;

  globalThis.$environment = { "surge-version": "5.20.0", system: "ios", language: "zh-Hans" };
  globalThis.$loon = undefined;
  globalThis.$task = undefined;
  globalThis.$argument = __eg_env;
  globalThis.$script = { name: (ctx.script && ctx.script.name) || "BodianMusic" };
  globalThis.$request = __eg_request;
  globalThis.$response = __eg_response;

  let __eg_done = false;
  let __eg_result = null;
  let __eg_resolve;
  const __eg_doneP = new Promise((r) => { __eg_resolve = r; });
  globalThis.$done = (v) => {
    if (!__eg_done) { __eg_done = true; __eg_result = v || null; }
    try { __eg_resolve(true); } catch (e) {}
  };

  // node 下（测试用）不要把事件循环钉住
  const __eg_sleep = (ms) => new Promise((r) => { const t = setTimeout(r, ms); if (t && typeof t.unref === "function") t.unref(); });
  const __eg_now = () => Date.now();

  // 上游若用了 atob/btoa（QuanX 分支）在 JSC 里也有，这里兜一层以防万一
  try {
    if (typeof globalThis.atob !== "function") {
      globalThis.atob = (s) => Buffer.from(String(s), "base64").toString("binary");
    }
  } catch (e) {}
