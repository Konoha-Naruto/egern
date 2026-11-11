  // ================= Egern → Surge API 桥 =================
  const __env = (ctx && ctx.env) || {};
  const __isReq = !!(ctx && ctx.request);

  // 模块参数 GETCK=false 时：请求脚本直接放行，不抓取、不通知；定时任务不受影响
  if (__isReq && String(__env.GETCK == null ? "true" : __env.GETCK).toLowerCase() === "false") return {};

  let __request;
  if (__isReq) {
    const r = ctx.request;
    const headers = {};
    try {
      const h = r.headers;
      if (h && typeof h.forEach === "function") h.forEach((v, k) => { headers[String(k).toLowerCase()] = v; });
      else if (h && typeof h === "object") for (const k of Object.keys(h)) headers[String(k).toLowerCase()] = h[k];
    } catch (e) {}
    let body = "";
    try { if (typeof r.text === "function") body = await r.text(); } catch (e) {}
    __request = { url: r.url, method: r.method || "GET", headers: headers, body: body };
  }

  const __mk = (method) => (opts, cb) => {
    (async () => {
      try {
        const o = typeof opts === "string" ? { url: opts } : (opts || {});
        const init = { headers: o.headers || {} };
        if (o.timeout) init.timeout = o.timeout;
        const m = method.toUpperCase();
        let resp;
        if (m === "GET") resp = await ctx.http.get(o.url, init);
        else if (m === "POST") resp = await ctx.http.post(o.url, Object.assign({}, init, { body: o.body }));
        else if (m === "PUT") resp = await ctx.http.put(o.url, Object.assign({}, init, { body: o.body }));
        else if (m === "DELETE") resp = await ctx.http.delete(o.url, init);
        else if (m === "PATCH") resp = await ctx.http.patch(o.url, Object.assign({}, init, { body: o.body }));
        else if (m === "HEAD") resp = await ctx.http.head(o.url, init);
        else resp = await ctx.http.get(o.url, init);
        const text = await resp.text();
        const rh = {};
        try { if (resp.headers && typeof resp.headers.forEach === "function") resp.headers.forEach((v, k) => { rh[k] = v; }); } catch (e) {}
        const status = resp.status || resp.statusCode || 200;
        const r = { status: status, statusCode: status, headers: rh, body: text };
        cb(null, r, text);
      } catch (e) {
        cb(e && e.message ? e.message : String(e), null, null);
      }
    })();
  };

  globalThis.$httpClient = {
    get: __mk("GET"), post: __mk("POST"), put: __mk("PUT"), delete: __mk("DELETE"),
    head: __mk("HEAD"), patch: __mk("PATCH"), options: __mk("OPTIONS"),
  };
  globalThis.$persistentStore = {
    read: (k) => { try { const v = ctx.storage.get(k); return v == null ? null : v; } catch (e) { return null; } },
    write: (v, k) => { try { ctx.storage.set(k, v == null ? "" : String(v)); return true; } catch (e) { return false; } },
  };
  globalThis.$notification = {
    post: (title, subtitle, body) => {
      const t = title == null ? "" : String(title);
      const s = subtitle ? String(subtitle) : "";
      const b = body == null ? "" : String(body);
      try { ctx.notify({ title: t, subtitle: s, body: b }); }
      catch (e) {
        try { ctx.notify(t, s ? s + "\n" + b : b); } catch (e2) {}
      }
    },
  };
  globalThis.$environment = { "surge-version": "5.20.0", system: "ios" };
  globalThis.$argument = {};
  globalThis.$request = __request;

  let __resolveDone;
  const __doneP = new Promise((r) => { __resolveDone = r; });
  globalThis.$done = () => { try { __resolveDone(true); } catch (e) {} };

  // node 下（测试用）不要把事件循环钉住；Egern 里 setTimeout 返回数字，unref 不存在
  const __sleep = (ms) => new Promise((r) => { const t = setTimeout(r, ms); if (t && typeof t.unref === "function") t.unref(); });

  // ================= 上游脚本（MaYIHEI/paperclip，逐字内联） =================
