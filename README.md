# Egern

自己用的 Egern 模块，按用途属性分目录。Surge 版在另一个仓库：[Konoha-Naruto/surge](https://github.com/Konoha-Naruto/surge)。

```
.
├── rules/apple/     规则集（下载 / 基础服务分开）
└── modules/
    ├── media/        媒体：会员签到
    ├── monitor/      面板 / 小组件
    └── network/      网络：链路修复、回环
```

## 规则集

| 文件 | 说明 | 条数 |
|---|---|---|
| `rules/apple/AppleDownload.yaml` | App Store / OTA / 固件下载 | 88 |
| `rules/apple/AppleServices.yaml` | APNs / iCloud / 账号激活 + `apple.com` 兜底 | 99 |

```
https://raw.githubusercontent.com/Konoha-Naruto/egern/main/rules/apple/AppleDownload.yaml
https://raw.githubusercontent.com/Konoha-Naruto/egern/main/rules/apple/AppleServices.yaml
```

**Download 必须排在 Services 之前**（后者带兜底），详见 [rules/apple/README.md](rules/apple/README.md)。

## 模块

| 属性 | 模块 | 说明 |
|---|---|---|
| media | [qqmusic](modules/media/qqmusic/) | QQ音乐签到（Surge 脚本的桥接移植，存储与 Surge 隔离） |
| monitor | [carrier](modules/monitor/carrier/) | 运营商聚合面板：联通 / 移动 / 电信 / 广电余额、流量、语音 |
| network | [telegram](modules/network/telegram/) | Telegram 劣化 DC IP 改写，解决一直转圈 |
| network | [loopback](modules/network/loopback/) | Surge「Local Device Loopback」移植（`10.7.0.1 → reflect`） |

安装地址规律：

```
https://raw.githubusercontent.com/Konoha-Naruto/egern/main/modules/<属性>/<模块>/<文件>.yaml
```

| 模块 | 安装地址 |
|---|---|
| QQ音乐签到 | https://raw.githubusercontent.com/Konoha-Naruto/egern/main/modules/media/qqmusic/QQMusic.egern.yaml |
| 运营商面板 | https://raw.githubusercontent.com/Konoha-Naruto/egern/main/modules/monitor/carrier/carrier-hub.yaml |
| Telegram 垃圾 IP | https://raw.githubusercontent.com/Konoha-Naruto/egern/main/modules/network/telegram/telegram-fktg.yaml |
| 本地设备回环 | https://raw.githubusercontent.com/Konoha-Naruto/egern/main/modules/network/loopback/LocalDeviceLoopback.egern.yaml |

Egern → 工具 → 模块 → 右上角 `+` → 填对应 URL。

## 约定

- 一个模块一个文件夹：YAML、它引用的 JS、预览图和说明放一起。
- `script_url` 写本仓库完整 raw 地址。
- 模块改不到的设置（`ipv6`、`vif_*_routes` 等）单独放 `Profile-补充片段.yaml`，并在该模块 README 里说明。
- 全部为个人自用配置，脚本多来自社区作者（文件头已标注来源）。
