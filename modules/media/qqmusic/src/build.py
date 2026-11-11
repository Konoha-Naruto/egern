#!/usr/bin/env python3
"""把 MaYIHEI/paperclip 的 qqmusic.js 包成 Egern 模块脚本。

上游是 Surge/Loon/QX/Stash 风格脚本（$httpClient/$persistentStore/...），
Egern 只给 ctx 对象，所以这里加一层桥，把 ctx 映射成上游认识的那几个全局。
生成结果：QQMusic.egern.js（可直接被 Egern 引用）
"""
import hashlib
import pathlib
import urllib.request

UPSTREAM = "https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/qqmusic/qqmusic.js"
HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE.parent / "QQMusic.egern.js"

HEADER = """// ─────────────────────────────────────────────────────────────
// QQ音乐签到 · Egern 移植版
//
// 原作: MaYIHEI  https://github.com/MaYIHEI/paperclip/tree/main/app/qqmusic
// 上游: {upstream}
// SHA256(上游): {sha}
//
// 说明: 上游是 Surge/Loon/QX 风格脚本（$request/$persistentStore/$httpClient/
//       $notification/$done），Egern 只提供 ctx 对象。本文件在入口处加了一层
//       桥，把 ctx 映射成上游认识的那些全局，然后把上游源码逐字内联执行，
//       所以签到逻辑与上游完全一致，上游更新后重新跑 build.py 即可。
//
// 本文件由 build.py 生成，不要手改。
// ─────────────────────────────────────────────────────────────
export default async function (ctx) {{
"""

FOOTER = """
  // ================= 上游结束 =================
  try {
    await Promise.race([
      __doneP,
      __sleep(__isReq ? 8000 : 900000),
    ]);
  } catch (e) {}
  return __isReq ? {} : undefined;
}
"""


def main() -> None:
    src_bytes = urllib.request.urlopen(UPSTREAM, timeout=30).read()
    sha = hashlib.sha256(src_bytes).hexdigest()
    src = src_bytes.decode("utf-8")
    bridge = (HERE / "bridge.js").read_text(encoding="utf-8")
    body = HEADER.format(upstream=UPSTREAM, sha=sha[:16]) + bridge + src + FOOTER
    OUT.write_text(body, encoding="utf-8")
    print(f"wrote {OUT}  {OUT.stat().st_size} bytes  upstream_sha={sha[:16]}")


if __name__ == "__main__":
    main()
