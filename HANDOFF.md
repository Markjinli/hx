# 合禧请帖 GitHub Pages 版交接

更新时间：2026-08-05

## 先说结论

这是与原 `HappyThing` 喜图生成器完全隔离的独立项目。原项目没有被修改、提交或推送。

- 本地目录：`C:\OneOnlyBackUP\USER\Documents\HappyThing-GitHubPages`
- GitHub仓库：`https://github.com/Markjinli/hexi-wedding-invitation`
- GitHub Pages：`https://markjinli.github.io/hexi-wedding-invitation/`
- 发布源：公开仓库 `main` 分支 `/ (root)`，`legacy` branch publishing，无 Actions 工作流
- HTTPS：已强制启用

## 已实现

- 根网址显示婚礼请帖制作页，字段包括两位姓名、日期、时间、宴会地点、详细地址和邀请寄语。
- 点击“生成我的专属请帖”后，将经过校验的信息写入 URL Fragment，并进入欢迎封面。
- H5 只有两个全屏页面：朱红鎏金欢迎封面、米白婚礼详情页。
- 页面内部状态不进入 URL：无论在第二页分享、刷新还是换一台设备打开，都从欢迎封面开始。
- 支持点击/上滑开启、返回封面、系统分享、复制链接及微信不支持 Web Share时的提示。
- 制作页新增 4 个原创通用分享小图：双喜团子、甜蜜小熊、喜鹊成双、喜信到啦。
- 制作页新增 4 条通用分享文案，并提供微信卡片样式预览。
- 图标与文案组合为 16 个预生成静态入口，微信抓取时可直接读取对应 `og:image` 与 `og:description`。
- 无效、截断、改单字符和未知版本链接进入独立错误页，不会套用示例信息。
- 无服务器、数据库、Cookie、统计脚本、外部字体或第三方网络请求。
- 分享小图统一优化为 512 × 512 JPEG（约 27–39 KB）；不包含真人、品牌或版权角色。

## 链接协议

```text
#i=v1.<base64url(UTF-8紧凑JSON)>.<CRC32>
```

- JSON字段：`a/b` 姓名、`d/t` 日期时间、`n/l` 场所地址、`m` 寄语。
- 三层硬限制：UTF-8 payload 1400 bytes、token 1900字符、完整 URL 2048字符。
- 文本做 NFC规范化，去控制字符、零宽字符和双向文本控制符；日期/时间严格校验。
- CRC32只检测链接复制损坏，不是签名、加密或防篡改。
- Fragment不会随网页请求发送给 GitHub，但会存在于地址栏、浏览器历史、剪贴板和聊天记录；得到完整链接的人可以阅读信息。

## 分享入口协议

```text
/share/v2/{icon-id}/{copy-id}/#i=v1.<payload>.<CRC32>
```

- 4 个 `icon-id` × 4 个 `copy-id` 共 16 个静态目录，由 `npm run build` 生成并随仓库提交。
- 微信抓取不到 Fragment，所以图标与分享文案放在不含个人信息的路径中；姓名、时间、地点和寄语仍只在 Fragment。
- 旧的根路径 `/#i=...` 保持兼容，默认使用 `double-happiness/classic` 的分享呈现。
- `share/v2` 是静态卡片版本号；以后若要主动避开旧缓存，可生成新版本目录，不要更改请帖 payload 协议。

## 关键文件

- `index.html`：制作页、两页 H5、静态元数据和安全策略。
- `styles.css`：响应式制作页、两页切换、手机安全区和减少动态效果支持。
- `app.js`：视图状态、表单、分享、复制、滑动、刷新回封面和错误恢复。
- `invite-codec.js`：v1协议、字段清洗、Base64URL、CRC32及日期处理。
- `share-options.js`：4 个图标、4 条文案及安全静态路径白名单。
- `scripts/build-share-pages.mjs`：由根模板生成 16 个静态分享入口。
- `icons/*.jpg`：4 张原创、通用、轻量的方形分享小图。
- `tests/*.test.mjs`：协议、安全边界、图片规格和 16 个入口元数据检查。
- `og.png`：旧版横向封面，已不再被分享元数据引用，可留作历史资产。

## 当前验证

- `npm run check`：通过。
- Node语法检查：通过。
- 自动测试：12/12 通过，包含中文/emoji往返、CRC标准向量、日期时间、截断/改单字符/未知版本、XSS文本、个人信息留在 Fragment、4 张图片规格和 16 个静态入口。
- `npm run build`：成功生成 16 个静态入口。
- 本地 HTTP：首页、嵌套分享入口、CSS、三个 JS 与 4 张图标均需保持 200。
- GitHub Pages首次构建状态：`built`。
- 上述 GitHub Pages状态与线上 200 记录属于 2026-08-04 旧版本；本次改动推送后必须重新确认最新 Pages build 和至少一个组合入口。

## 尚需真机验收

桌面和主机检查不能证明微信内置浏览器行为。正式大范围使用前，至少验证：

1. iPhone 微信与一台主流安卓微信填写、生成、复制、发送、打开。
2. 在详情页分享后，接收方仍从欢迎封面开始。
3. 微信聊天没有截断最大长度链接，也没有丢弃 `#` Fragment。
4. 小屏、刘海屏、底部手势区、输入法弹起和长姓名/地址显示。
5. 分别选择至少两个图标、两条文案生成新链接，确认微信卡片随静态路径变化。
6. 微信可能缓存旧卡片；优先测试从未发送过的组合路径，不要把缓存结果误判为代码未生效。

若真实微信会丢弃 Fragment，先保留当前版本证据，再评估改用隐私较弱的 Query参数；不要仅凭桌面浏览器推断。

## 继续开发

新会话先读本文件，然后运行：

```powershell
npm run check
python -m http.server 4173
```

修改 `index.html`、图标或分享选项后先运行 `npm run build`。发布需把生成的 `share/v2/**/index.html` 一并提交并推送 `main`；Pages会从仓库根目录重新构建。不要在本仓库加入需要 `workflow` scope 的 Actions文件，除非明确决定迁移发布方式。
