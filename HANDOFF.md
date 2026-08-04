# 合禧请帖 GitHub Pages 版交接

更新时间：2026-08-04

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
- 无效、截断、改单字符和未知版本链接进入独立错误页，不会套用示例信息。
- 无服务器、数据库、Cookie、统计脚本、外部字体或第三方网络请求。
- 使用统一 `og.png` 分享封面；纯静态站不承诺为每对新人生成个性化微信缩略图。

## 链接协议

```text
#i=v1.<base64url(UTF-8紧凑JSON)>.<CRC32>
```

- JSON字段：`a/b` 姓名、`d/t` 日期时间、`n/l` 场所地址、`m` 寄语。
- 三层硬限制：UTF-8 payload 1400 bytes、token 1900字符、完整 URL 2048字符。
- 文本做 NFC规范化，去控制字符、零宽字符和双向文本控制符；日期/时间严格校验。
- CRC32只检测链接复制损坏，不是签名、加密或防篡改。
- Fragment不会随网页请求发送给 GitHub，但会存在于地址栏、浏览器历史、剪贴板和聊天记录；得到完整链接的人可以阅读信息。

## 关键文件

- `index.html`：制作页、两页 H5、静态元数据和安全策略。
- `styles.css`：响应式制作页、两页切换、手机安全区和减少动态效果支持。
- `app.js`：视图状态、表单、分享、复制、滑动、刷新回封面和错误恢复。
- `invite-codec.js`：v1协议、字段清洗、Base64URL、CRC32及日期处理。
- `tests/invite-codec.test.mjs`：协议、安全边界和发布面检查。
- `og.png`：不含新人资料的统一分享封面。

## 当前验证

- `npm run check`：通过。
- Node语法检查：通过。
- 自动测试：8/8 通过，包含中文/emoji往返、CRC标准向量、日期时间、截断/改单字符/未知版本、XSS文本和相对资源路径。
- 本地 HTTP：首页、CSS、两个 JS、OG图片均为 200。
- GitHub Pages首次构建状态：`built`。
- 线上首页、CSS、`app.js`、`og.png` 均为 200。

## 尚需真机验收

桌面和主机检查不能证明微信内置浏览器行为。正式大范围使用前，至少验证：

1. iPhone 微信与一台主流安卓微信填写、生成、复制、发送、打开。
2. 在详情页分享后，接收方仍从欢迎封面开始。
3. 微信聊天没有截断最大长度链接，也没有丢弃 `#` Fragment。
4. 小屏、刘海屏、底部手势区、输入法弹起和长姓名/地址显示。

若真实微信会丢弃 Fragment，先保留当前版本证据，再评估改用隐私较弱的 Query参数；不要仅凭桌面浏览器推断。

## 继续开发

新会话先读本文件，然后运行：

```powershell
npm run check
python -m http.server 4173
```

发布只需提交并推送 `main`；Pages会从仓库根目录重新构建。不要在本仓库加入需要 `workflow` scope 的 Actions文件，除非明确决定迁移发布方式。
