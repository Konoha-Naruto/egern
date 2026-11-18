#!/usr/bin/env python3
"""把 WeiGiegie/666 的 bdyy.js（波点音乐）包成 Egern 模块脚本。

上游是 Surge/QuanX/Loon 自动适配写法（$request/$response/$done/$httpClient），
Egern 只给 ctx 对象，所以这里加一层桥，把 ctx 映射成上游认识的那几个全局。

为什么上游要放进字符串再 new Function 跑，而不是直接内联进函数体：
上游是 javascript-obfuscator 混淆过的，内部用 `(function(){return this})()` 反查
全局对象（拿 RegExp / Date 等构造器）。ESM 模块体是严格模式，`this` 为 undefined，
直接内联进 async function 会立刻抛 `Cannot read properties of undefined (reading 'RegExp')`。
new Function / 间接 eval 的代码体是 sloppy mode，`this` 才是全局对象，与 Surge/QuanX
的真实运行环境一致。

输出：../BodianMusic.egern.js
"""
import datetime
import hashlib
import json
import pathlib
import urllib.request

UPSTREAM = "https://raw.githubusercontent.com/WeiGiegie/666/main/bdyy.js"
HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE.parent / "BodianMusic.egern.js"

HEADER = """// ─────────────────────────────────────────────────────────────
// 波点音乐 · Egern 移植版（会员 / 去广告 / 下载 / 付费专辑解锁）
//
// 原作: WeiGiegie  https://github.com/WeiGiegie/666
// 上游: {upstream}
// SHA256(上游): {sha}
// 生成: {date}
//
// 说明: 上游是 Surge/QuanX/Loon 三平台自动适配脚本（$request/$response/$done/
//       $httpClient），Egern 只提供 ctx。本文件在入口处加桥，把 ctx 映射成上游
//       认识的全局，再把上游源码原样交给 new Function 执行（上游用 `this` 反查
//       全局对象，必须是 sloppy mode 的 this = globalThis，见 src/build.py 注释）。
//       $done 的返回值再映射回 Egern response 脚本要求的 {{status, headers, body}}。
//
// 本文件由 src/build.py 生成，不要手改。
// ─────────────────────────────────────────────────────────────
export default async function (ctx) {{
"""

RUNNER = """
  // ================= 执行上游（sloppy mode + this = globalThis） =================
  const __eg_src = {src};
  let __eg_ran = false;
  try {{
    const __eg_fn = new Function(__eg_src);
    __eg_fn.call(globalThis);
    __eg_ran = true;
  }} catch (e) {{
    try {{ (0, eval)(__eg_src); __eg_ran = true; }} catch (e2) {{}}
  }}
"""

FOOTER = """
  // ================= 上游结束 =================
  if (__eg_ran) {
    try { await Promise.race([__eg_doneP, __eg_sleep(8000)]); } catch (e) {}
  }

  const __eg_out = __eg_result;
  if (typeof __eg_out === "string") return { body: __eg_out };
  if (__eg_isResp && __eg_out && typeof __eg_out === "object") {
    const __eg_res = {};
    if (__eg_out.status !== undefined && __eg_out.status !== null) __eg_res.status = __eg_out.status;
    if (__eg_out.headers) __eg_res.headers = __eg_out.headers;
    if (__eg_out.body !== undefined) __eg_res.body = __eg_out.body;
    if (Object.keys(__eg_res).length) return __eg_res;
  }
  return undefined;
}
"""


def main() -> None:
    src_bytes = urllib.request.urlopen(UPSTREAM, timeout=60).read()
    sha = hashlib.sha256(src_bytes).hexdigest()
    src = src_bytes.decode("utf-8")
    bridge = (HERE / "bridge.js").read_text(encoding="utf-8")
    head = HEADER.format(
        upstream=UPSTREAM,
        sha=sha[:16],
        date=datetime.date.today().isoformat(),
    )
    body = head + bridge + RUNNER.format(src=json.dumps(src, ensure_ascii=False)) + FOOTER
    OUT.write_text(body, encoding="utf-8")
    print(f"wrote {OUT}  {OUT.stat().st_size} bytes  upstream_sha={sha[:16]}  upstream={len(src_bytes)}B")


if __name__ == "__main__":
    main()
