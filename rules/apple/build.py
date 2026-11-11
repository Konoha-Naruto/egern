#!/usr/bin/env python3
"""把 Surge 版的 Apple 规则集转成 Egern 规则集（yaml）。

单一数据源：直接拉 Surge 仓库里那两份 .list，避免两边手工维护漂移。
    https://raw.githubusercontent.com/Konoha-Naruto/surge/main/rules/apple/AppleDownload.list
    https://raw.githubusercontent.com/Konoha-Naruto/surge/main/rules/apple/AppleServices.list

Surge 规则类型 -> Egern 键：
    DOMAIN          -> domain_set
    DOMAIN-SUFFIX   -> domain_suffix_set
    DOMAIN-KEYWORD  -> domain_keyword_set
    IP-CIDR         -> ip_cidr_set
    IP-CIDR6        -> ip_cidr6_set
"""
import pathlib
import urllib.request

BASE = "https://raw.githubusercontent.com/Konoha-Naruto/surge/main/rules/apple"
OUT = pathlib.Path(__file__).resolve().parent

JOBS = [
    ("AppleDownload.list", "AppleDownload.yaml", "AppleDownload", "App Store 商店与 App 下载、系统更新与固件 CDN"),
    ("AppleServices.list", "AppleServices.yaml", "AppleServices", "APNs、账号/激活、iCloud 等基础服务（不含下载类）"),
]

KEYMAP = {
    "DOMAIN": "domain_set",
    "DOMAIN-SUFFIX": "domain_suffix_set",
    "DOMAIN-KEYWORD": "domain_keyword_set",
    "IP-CIDR": "ip_cidr_set",
    "IP-CIDR6": "ip_cidr6_set",
}
ORDER = ["domain_set", "domain_suffix_set", "domain_keyword_set", "ip_cidr_set", "ip_cidr6_set"]


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8")


def parse(text):
    groups = {}
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = [p.strip() for p in line.split(",")]
        kind = parts[0].upper()
        if kind not in KEYMAP:
            continue
        value = parts[1]
        if len(parts) > 2 and parts[2].lower() == "no-resolve":
            pass  # no_resolve 在 Egern 是文件级开关
        groups.setdefault(KEYMAP[kind], []).append(value)
    return groups


def emit(out_name, title, desc, groups, src):
    total = sum(len(v) for v in groups.values())
    lines = [
        f"# 规则名称: {title}",
        f"# 规则统计: {total}",
        f"# 说明: {desc}",
        f"# 来源: {src}",
        "",
    ]
    if "ip_cidr_set" in groups or "ip_cidr6_set" in groups:
        lines.append("no_resolve: true")
        lines.append("")
    for key in ORDER:
        vals = groups.get(key)
        if not vals:
            continue
        seen, uniq = set(), []
        for v in vals:
            if v not in seen:
                seen.add(v)
                uniq.append(v)
        lines.append(f"{key}:")
        lines += [f"  - {v}" for v in sorted(uniq)]
        lines.append("")
    (OUT / out_name).write_text("\n".join(lines), encoding="utf-8")
    print(f"{out_name:22s} {total:4d} 条  " + ", ".join(f"{k}={len(v)}" for k, v in groups.items()))


def main():
    for src_name, out_name, title, desc in JOBS:
        url = f"{BASE}/{src_name}"
        emit(out_name, title, desc, parse(fetch(url)), url)


if __name__ == "__main__":
    main()
