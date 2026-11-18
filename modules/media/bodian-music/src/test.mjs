// 用假 ctx 驱动 Egern 版脚本，验证桥接层与上游逻辑不崩、能吐出改过的 body。
// 用法: node test.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BUILT = path.join(HERE, "..", "BodianMusic.egern.js");
const TMP = path.join(os.tmpdir(), `bodian-test-${process.pid}.mjs`);
fs.copyFileSync(BUILT, TMP);
const { default: handler } = await import("file://" + TMP);
fs.unlinkSync(TMP);

const notes = [];
const logs = [];
const realLog = console.log;
console.log = (...a) => { logs.push(a.map(String).join(" ")); };

const mkHeaders = (o = {}) => {
  const m = new Map(Object.entries(o).map(([k, v]) => [k.toLowerCase(), String(v)]));
  return {
    forEach: (fn) => m.forEach((v, k) => fn(v, k)),
    get: (k) => (m.has(String(k).toLowerCase()) ? m.get(String(k).toLowerCase()) : null),
    has: (k) => m.has(String(k).toLowerCase()),
  };
};

const mkCtx = (url, body, extra = {}) => ({
  env: {},
  script: { name: "波点音乐" },
  storage: { get: () => null, set: () => {}, getJSON: () => null, setJSON: () => {}, delete: () => {} },
  notify: (o) => notes.push(o),
  http: {
    get: async () => ({ status: 200, headers: mkHeaders(), text: async () => "{}" }),
    post: async () => ({ status: 200, headers: mkHeaders(), text: async () => "{}" }),
  },
  request: { url, method: "GET", headers: mkHeaders({ "user-agent": "BodianMusic/5.2.5" }) },
  response: { status: 200, headers: mkHeaders({ "content-type": "application/json" }), text: async () => body },
  ...extra,
});

const cases = [
  ["场景页配置（去商城 Tab）", "https://bd-api.kuwo.cn/api/service/global/config/scene?app=1",
    JSON.stringify({ code: 200, data: { showShopEntry: true, idolTabShow: false, foo: 1 } })],
  ["开屏弹窗", "https://bd-api.kuwo.cn/api/popup/start/info",
    JSON.stringify({ code: 200, data: { show: true, type: 1, img: "x" } })],
  ["会员权益校验", "https://bd-api.kuwo.cn/api/play/music/v2/checkRight?ids=123",
    JSON.stringify({ code: 200, data: [{ rid: 123, isVip: false, vipType: 0 }] })],
  ["音频地址（核心解锁）", "https://bd-api.kuwo.cn/api/play/music/v2/audioUrl?rid=123&type=convert_url2",
    JSON.stringify({ code: 200, data: { rid: 123, url: "http://x/1.mp3", bitrate: 320, format: "mp3", isVip: false } })],
  ["非 JSON body（应原样放行）", "https://bd-api.kuwo.cn/api/abtest/ui/info", "<html>not json</html>"],
  ["未匹配 URL（应原样放行）", "https://example.com/x", JSON.stringify({ a: 1 })],
];

let fail = 0;
for (const [name, url, body] of cases) {
  logs.length = 0; notes.length = 0;
  const t0 = Date.now();
  let out, err = null;
  try { out = await handler(mkCtx(url, body)); } catch (e) { err = e; }
  const ms = Date.now() - t0;
  realLog(`\n===== ${name} =====`);
  realLog("  返回:", err ? "抛异常 " + err.message : JSON.stringify(out));
  realLog("  通知:", JSON.stringify(notes));
  realLog("  耗时:", ms + "ms", "| 日志:", logs.slice(0, 3).join(" / ") || "(空)");
  if (err) fail++;
}
realLog(`\n通过 ${cases.length - fail}/${cases.length}`);
// 上游会挂 setInterval 做反调试，测试进程里直接退
process.exit(fail ? 1 : 0);
