// 用假 ctx 驱动 Egern 版脚本，验证桥接层与上游逻辑能跑通。
// 用法: node test.mjs
import handler from "../QQMusic.egern.js";

const store = new Map();
const notes = [];
const logs = [];
const realLog = console.log;
console.log = (...a) => { logs.push(a.join(" ")); };

const mkCtx = (extra = {}) => ({
  env: {},
  storage: {
    get: (k) => (store.has(k) ? store.get(k) : null),
    set: (k, v) => { store.set(k, String(v)); },
  },
  notify: (o) => notes.push(o),
  http: {
    get: async (url, init = {}) => {
      const r = await fetch(url, { method: "GET", headers: init.headers || {} });
      return { status: r.status, headers: r.headers, text: () => r.text() };
    },
    post: async (url, init = {}) => {
      const r = await fetch(url, { method: "POST", headers: init.headers || {}, body: init.body });
      return { status: r.status, headers: r.headers, text: () => r.text() };
    },
  },
  ...extra,
});

const step = (name) => { logs.length = 0; notes.length = 0; realLog("\n===== " + name + " ====="); };

// 1) 定时任务，但还没有 Cookie
step("cron / 无 Cookie");
let out = await handler(mkCtx());
realLog("返回:", JSON.stringify(out));
realLog("通知:", JSON.stringify(notes));
realLog("日志尾部:", logs.slice(-3).join(" | "));

// 2) 抓取 Cookie（假值，只为验证解析与落库）
step("http_request / 抓 Cookie");
const cookie = "qm_keyst=FAKEKEY123; uin=o0123456789; refresh_key=FAKEREFRESH; tmeLoginType=1";
const req = {
  url: "https://u6.y.qq.com/cgi-bin/musics.fcg?_webcgikey=EveryDaySignLvzScore&_=1&sign=abc",
  method: "POST",
  headers: new Headers({ cookie, "user-agent": "QQMusic/1.0" }),
  text: async () => JSON.stringify({ req_0: { module: "music.musicasset.SignInRead", param: { Aid: "Z25hHGi", Sid: "2" } } }),
};
out = await handler(mkCtx({ request: req }));
realLog("返回:", JSON.stringify(out));
realLog("通知:", JSON.stringify(notes));
const saved = store.get("qqmusic_data");
realLog("落库:", saved ? "有 qqmusic_data (" + saved.length + "B)" : "无");

// 3) 再跑定时任务：应走到网络层（假 Cookie 会失败，但桥接不能崩）
step("cron / 假 Cookie 跑一次");
out = await handler(mkCtx());
realLog("返回:", JSON.stringify(out));
realLog("通知:", JSON.stringify(notes));
realLog("错误行数:", logs.filter((l) => /错误|error|失败/.test(l)).length);
realLog("日志尾部:", logs.slice(-4).join(" | "));

console.log = realLog;

process.exit(0);
