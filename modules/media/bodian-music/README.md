# 波点音乐（Egern）

波点音乐 **会员标识解锁 + 无损/付费专辑下载 + 付费专辑解锁 + 去广告**。纯响应体改写，不抓 Cookie、不签到。

上游 [WeiGiegie/666 · bdyy.js](https://github.com/WeiGiegie/666/blob/main/bdyy.js) 是 Surge/QuanX/Loon 三平台自动适配脚本（`$request/$response/$done/$httpClient`），Egern 只注入 `ctx`，所以这里加了一层桥：把 `ctx` 映射成上游认识的那些全局，再让上游源码原样跑。行为与上游完全一致。

Surge 版在另一个仓库：[Konoha-Naruto/surge](https://github.com/Konoha-Naruto/surge/tree/main/modules/media/bodian-music)。

## 文件

| 文件 | 说明 |
|---|---|
| `BodianMusic.egern.yaml` | Egern 模块（1 条 `http_response` + 1 条 `reject-200` 重写 + 20 个 MITM 主机名） |
| `BodianMusic.egern.js` | 构建产物：桥接层 + 上游源码字符串，**不要手改** |
| `src/bridge.js` | 桥接层（ctx → `$request` / `$response` / `$done` / `$httpClient` / `$notification` / `$persistentStore`） |
| `src/build.py` | 拉上游最新 `bdyy.js`，拼桥接层，输出上一级 |
| `src/test.mjs` | 假 ctx 驱动的 6 场景冒烟测试 |

## 安装

```
https://raw.githubusercontent.com/Konoha-Naruto/egern/main/modules/media/bodian-music/BodianMusic.egern.yaml
```

Egern → 工具 → 模块 → `+` → 填 URL；确认 MITM 已开、证书已信任。

## 移植要点（为什么不是照抄）

1. **上游必须跑在 sloppy mode**。上游是 javascript-obfuscator 混淆过的，内部用 `(function(){return this})()` 反查全局对象来取 `RegExp` / `Date`。ESM 模块体是严格模式，`this` 是 `undefined`，直接内联进 `export default async function` 会立刻抛 `Cannot read properties of undefined (reading 'RegExp')`。所以产物里上游以**字符串**形式交给 `new Function(src)`（拿不到 Function 构造器时回退 `(0, eval)(src)`），代码体是 sloppy mode，`this === globalThis`，与 Surge / QuanX 的真实环境一致。
2. **`$done` 的返回值要翻译**。上游只会 `$done({body: ...})`，Egern 的 response 脚本要 `return {status, headers, body}`；桥接层只透传 `$done` 里真正出现过的字段，`$done({})`（放行）就返回 `undefined`，表示不改包。
3. **`$response.body` 只能读一次**。桥接层在入口把 `ctx.response.text()` 读成字符串交给上游；`ctx.request` 只取 url / method / headers，不碰 body（response 阶段读会把流消费掉）。
4. **`reject-200` 有原生等价物**：`url_rewrites` + `location: http://reject-200/`（200 空响应），与 Surge 的 `- reject-200` 等价。

## 生效范围

| 功能 | 命中接口（前缀） |
|---|---|
| 会员标识 / VIP 状态 | `bd-api.kuwo.cn/api/ucenter/users/(pub\|login)`、`pay/vip/*`、`sp/actVip` |
| 音质 / 播放权限 | `play/music/v2/(audioUrl\|checkRight)` |
| 下载 / 付费专辑 | `service/music/(info\|download/info\|download/config)`、`pay/audition/url` |
| 开屏 / 弹窗 / 悬浮广告 | `popup/start/info`、`advert/*`、`pay/vip/invitation/assist/popup` |
| 横幅 / 商城 Tab / 首页模块 | `service/banner/*`、`service/home/module`、`global/config/(scene\|vipEnter)` |
| 搜索热词 | `search/topic/word/list` |
| 开屏联盟广告（第三方） | `us.l.qq.com/exapp`、`xs.gdt.qq.com/style_factory/template_list` |
| 腾讯音乐联盟广告域名 | `tmeadcomm.y.qq.com` → 200 空响应 |

## 注意

- **建议先卸载重装波点音乐**再启用：广告位 / 会员状态会缓存在 App 本地，旧缓存会让效果看起来没生效。
- 响应体上限设为 `max_size: 2097152`（2 MB），超出不交给脚本。
- 混淆脚本单次执行约 1.2–1.4 s（字符串解码 + 反调试），属上游本身成本；`timeout` 给了 20 s 兜底。
- Egern 的存储与 Surge 隔离，本模块不写入任何存储。

## 重新生成

```bash
cd src
python3 build.py        # 输出上一级 BodianMusic.egern.js，头部写入上游 SHA256 前 16 位
node test.mjs           # 6 个场景冒烟测试
```

`test.mjs` 覆盖：场景页配置（去商城 Tab）、开屏弹窗、会员权益校验、音频地址、非 JSON body、未匹配 URL。用例在假 ctx 上跑，会真实经过上游的字段裁剪逻辑。

## 校验记录（2026-11-18）

- 上游 SHA256 前 16 位 `9f1ed2a7f54bff17`，176,784 B
- 产物 183,616 B；`node test.mjs` → **6/6 通过**
- `场景页配置` 用例实测输出 `showShopEntry=false, idolTabShow=true`（上游确实在改 body）
- 模块 YAML 可被 `yaml.safe_load` 解析，正则 `new RegExp()` 可编译（571 字符，与 Surge 版同一份）
- **尚未做的**：Egern 真机导入 + 实际 App 抓包验证（本机没有 Egern 运行环境）

## 来源

脚本作者 WeiGiegie。仅供个人学习交流。
