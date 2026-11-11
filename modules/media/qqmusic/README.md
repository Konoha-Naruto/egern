# QQ音乐签到（Egern）

QQ音乐 **绿钻成长值签到 + 金币中心签到 + App 每日任务 + 金币抽奖 + 红包雨**，一次抓包，之后全自动。

上游 [MaYIHEI/paperclip · app/qqmusic](https://github.com/MaYIHEI/paperclip/tree/main/app/qqmusic) 是 Surge 风格脚本（`$request/$persistentStore/...`），
Egern 只提供 `ctx`，所以这里加了一层桥：把 `ctx` 映射成上游认识的那些全局，再逐字执行上游源码。

Surge 版在另一个仓库：[Konoha-Naruto/surge](https://github.com/Konoha-Naruto/surge/tree/main/modules/media/qqmusic)。

## 文件

| 文件 | 说明 |
|---|---|
| `QQMusic.egern.yaml` | Egern 模块（4 条 scriptings + MITM + `GETCK` 参数） |
| `QQMusic.egern.js` | 构建产物：桥接层 + 上游源码，**不要手改** |
| `src/bridge.js` | 桥接层 |
| `src/build.py` | 拉上游最新 `qqmusic.js`，拼桥接层，输出上一级 |
| `src/test.mjs` | 假 ctx 驱动的三场景测试 |

## 安装

```
https://raw.githubusercontent.com/Konoha-Naruto/egern/main/modules/media/qqmusic/QQMusic.egern.yaml
```

Egern → 工具 → 模块 → `+` → 填 URL。

## 使用步骤

1. 安装模块，确认 MITM 生效（模块自带 `u6.y.qq.com`）。
2. 打开 QQ音乐 →「我的 → 会员中心」→ 进「金币中心 → 每日签到」页面一次。
3. 收到 `✅ QQ音乐 Cookie 获取成功` 通知即抓取成功。
4. 之后保持代理运行即可，Cookie 由 cron 自动续期，不用再进 App。

## 参数：抓取 Cookie（GETCK）

模块 → 编辑 → 「抓取 Cookie」开关，默认开。抓成功后关掉，请求脚本就直接放行、不再拦截。

**cron 定时任务不受这个开关影响。**

> Egern 的存储与 Surge 完全隔离 —— 即使 Surge 里已经抓过 Cookie，Egern 也要再抓一次。

## 定时任务

| 任务 | cron | 说明 |
|---|---|---|
| QQ音乐每日任务 | `30 7 * * *` | 续期 Cookie、两套签到、每日任务、免费抽奖；当天没跑成功，后续 cron 会补跑 |
| QQ音乐定时金币 | `* 9-10 * * *` | 9–10 点每分钟唤醒，按各任务返回的 `TargetNum / Progress / TaskMaxTimes / State` 决定是否发请求 |
| QQ音乐红包雨 | `5 0,8,12,16,20,22 * * *` | 六个时段各跑一次，每时段只请求一次 |

结果合并成最多一条通知，没新结果不打扰。

## 注意

- **模块参数里含逗号的值必须加引号**（如 `cronexp: "5 0,8,12,16,20,22 * * *"`），否则逗号会被当分隔符。
- 上游那份 Surge 片段里的 `max-size=0` 不能照搬：在 Surge 语义里表示「响应体上限 0 字节」，会拒掉请求、Cookie 永远抓不到。
- `* 9-10 * * *` 每分钟唤醒会增加少量耗电，觉得费电可以停用该项。
- Cookie 存在客户端持久化存储里，模块本身不含任何凭证。

## 重新生成

```bash
cd src
python3 build.py        # 输出上一级 QQMusic.egern.js，头部写入上游 SHA256 前 16 位
```

## 校验

用假 ctx 跑三个场景（无 Cookie / 抓 Cookie / 定时任务）：

```bash
cd src && node test.mjs
```

iSH 里 node 直连 `u.y.qq.com` 会 ECONNRESET（Surge MITM 证书不被信任），测试时可加
`NODE_TLS_REJECT_UNAUTHORIZED=0`。
