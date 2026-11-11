# Apple：下载 / 基础服务 分开（Egern 版）

Surge 版那两份的 Egern 对照版，格式与 `Repcz/Tool` 的 `Egern/Rules/*.yaml` 一致（`domain_set` / `domain_suffix_set` / …）。

| 文件 | 管什么 | 条数 |
|---|---|---|
| `AppleDownload.yaml` | App Store 商店与 App 本体下载、系统更新、固件与更新 CDN | 88 |
| `AppleServices.yaml` | APNs、账号/激活、iCloud、其余 Apple 服务 | 99 |

```
https://raw.githubusercontent.com/Konoha-Naruto/egern/main/rules/apple/AppleDownload.yaml
https://raw.githubusercontent.com/Konoha-Naruto/egern/main/rules/apple/AppleServices.yaml
```

## ⚠️ 顺序

`AppleServices.yaml` 带兜底后缀 `apple.com`，所以 **Download 必须排在 Services 前面**：

```
AppleDownload → 下载策略（大带宽）
AppleServices → DIRECT 或另一条策略
```

顺序反了，App Store 和系统更新会被 Services 兜底吃掉。

## 字段对照

| Surge 规则 | Egern 键 | 本目录条数（Download / Services） |
|---|---|---|
| `DOMAIN` | `domain_set` | 67 / 5 |
| `DOMAIN-SUFFIX` | `domain_suffix_set` | 21 / 65 |
| `DOMAIN-KEYWORD` | `domain_keyword_set` | — / 7 |
| `IP-CIDR` | `ip_cidr_set` | — / 15 |
| `IP-CIDR6` | `ip_cidr6_set` | — / 7 |

`AppleServices.yaml` 带 `no_resolve: true`（Surge 里是逐条 `no-resolve` 参数），两条 IP 段列表不触发 DNS 解析。

## 重新生成

数据源是 **Surge 仓库**那两份 `.list`，不在这里重复维护：

```bash
python3 build.py
```

上游改了（`surge/rules/apple/build.py` 增删域名）重新跑一次，两边自动对齐。

## 覆盖范围

与 Surge 版完全一致，详见 [surge 仓库的说明](https://github.com/Konoha-Naruto/surge/blob/main/rules/apple/README.md)。

要点：
- **下载**：`apps.apple.com`、`itunes.apple.com`、`iosapps.itunes.apple.com`（App 本体）、`mzstatic.com`（图标/截图）、`updates.cdn-apple.com`、`mesu.apple.com`、`swcdn/swdist/oscdn.apple.com`、`appldnld.apple.com`
- **服务**：`push.apple.com` + `identity.apple.com`（APNs）、`appleid.apple.com`、`gsa.apple.com`、`icloud.com` 全家、`apple.com` 兜底
