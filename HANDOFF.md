# 合禧请帖 GitHub Pages 版交接

更新时间：2026-08-05

## 先说结论

这是与原 `HappyThing` 喜图生成器完全隔离的独立项目。原项目没有被修改、提交或推送。

- 本地目录：`C:\OneOnlyBackUP\USER\Documents\HappyThing-GitHubPages`
- GitHub 仓库：`https://github.com/Markjinli/hx`
- GitHub Pages：`https://markjinli.github.io/hx/`
- 旧地址兼容仓库：`https://github.com/Markjinli/hexi-wedding-invitation`
- 旧地址兼容页：`https://markjinli.github.io/hexi-wedding-invitation/`
- 发布源：公开仓库 `main` 分支 `/ (root)`，branch publishing，无 Actions 工作流

## 已实现

- 根网址是制作页；填写两位姓名、日期、时间、宴会地点、详细地址和邀请寄语后生成链接。
- H5 只有两个全屏页面：朱红鎏金欢迎封面、米白婚礼详情页；刷新、转发和换设备打开都从欢迎封面开始。
- 4 个原创通用分享小图 × 4 条通用文案的当前入口为 `q/` 至 `z/`、`0/` 至 `5/`；旧 `a/` 至 `p/` 仍保留。每页都有对应 OG 信息和 body 第一张静态首图。
- 微信缩略图专用资产位于 `thumbs/`：300 × 300、Baseline JPEG、约 12–18 KB。新文件名与新单字符页面路径用于绕开上一轮灰色占位缓存。
- 从旧 `a-p` 请帖再次复制或分享时，`app.js` 会主动生成对应的当前 `q-z/0-5` 地址，不继续传播旧缓存键。
- 新协议使用无字段名紧凑载荷、无 `i=` 参数、压缩日期时间和 6 字符 CRC32；典型完整网址比旧版约短 32%。
- 解码器继续兼容旧 `#i=v1...`；旧项目地址另设静态兼容仓库，负责保留 Fragment 并转向新站。
- 自托管原创婚礼纯音乐 `m.mp3`：约 3 分 13 秒、80 kbps、1.93 MB、循环播放，音量 0.38。
- 页面先尝试自动播放；受浏览器策略阻止时，在点击/上滑/键盘进入详情的用户手势中重试。右上角按钮可暂停或恢复，并提供无障碍状态。
- 无服务器、数据库、Cookie、统计脚本、外部字体或第三方运行时请求。
- 分享图均为原创通用 512 × 512 JPEG，不含真人、品牌或版权角色。

## 链接协议

```text
https://markjinli.github.io/hx/{q-z或0-5}/#2.<base64url(七字段 UTF-8 数据)>.<6字符 CRC32>
```

- 七字段顺序：两位姓名、日期、时间、场所、地址、寄语；用清洗后不会出现的控制字符分隔。
- 日期去 `-`、时间去 `:`；解析后恢复并严格验证真实日期/时间。
- 三层硬限制：UTF-8 payload 1400 bytes、token 1900 字符、完整 URL 2048 字符。
- 文本做 NFC 规范化，去控制字符、零宽字符和双向文本控制符。
- CRC32 只检测链接复制损坏，不是签名、加密或防篡改。
- Fragment 不随网页请求发送给 GitHub，但会存在地址栏、浏览器历史、剪贴板和聊天记录；得到完整链接的人可以读取信息。

旧版 `#i=v1.<base64url(JSON)>.<8字符CRC32>` 仍能解码。16 个旧 `/share/v2/{icon-id}/{copy-id}/` 地址由兼容站映射到仍保留的 `a/` 至 `p/`。

## 关键文件

- `index.html`：制作页、两页 H5、音乐元素、静态元数据和安全策略。
- `styles.css`：响应式布局、页面切换、音乐开关、手机安全区和减少动态效果。
- `app.js`：视图状态、表单、分享、滑动、刷新回封面和音乐控制。
- `invite-codec.js`：v2 紧凑协议、v1 兼容、字段清洗、Base64URL、CRC32 和日期处理。
- `share-options.js`：4 个图标、4 条文案、当前 16 个入口和旧 16 个入口的固定映射。
- `scripts/build-share-pages.mjs`：由根模板生成 32 个静态分享入口。
- `thumbs/*.jpg`：4 张微信兼容 Baseline JPEG 缩略图；`icons/*.jpg` 仍用于页面内可见预览。
- `m.mp3`：自托管原创背景音乐。
- `icons/*.jpg`：4 张原创、通用、轻量的页面内方形分享小图。
- `tests/*.test.mjs`：协议、安全边界、图片、音乐和静态入口检查。

## 当前验证

- `npm run check`：通过；构建当前与旧版共 32 个入口，Node 语法与 15 项自动测试全部通过。
- 新协议中文/emoji 往返、CRC 标准向量、损坏/未知版本、动态与固定旧 v1 链接兼容均有测试。
- `m.mp3` 已检查 MP3 帧、文件大小、HTML 播放属性、JS 播放逻辑和减少动态效果。
- 功能提交：`0d0bd6b`（`feat: add music and compact invitation links`）；`hx` Pages 对该提交构建为 `built`，无构建错误。
- 微信缩略图修复提交：`5bb9036`，通过 PR `#1` 合入主线；合并提交 `b3fecc8` 的 Pages 构建为 `built`，无构建错误。
- 线上以 MicroMessenger UA 逐一检查 32 个页面与 4 张 `thumbs`：全部 200、类型正确、OG/首图映射正确，远端图片字节与仓库一致且含 Baseline JPEG SOF0。
- 真实浏览器打开 `/hx/w/#2...` 后为欢迎页，选项为 `sweet-bears/two-families`，第一张静态图为对应 `thumbs/b.jpg`，请帖姓名正确解析且首图不会出现在可见区域。
- 兼容站提交：`c0b92c0`；旧仓库 Pages 对该提交构建为 `built`，无构建错误。
- 线上新首页、`f/` 分享页、`m.mp3` 和分享图均为 200；音乐为 `audio/mp3` 且长度 1,928,715 bytes。
- 线上旧根页与 `sweet-bears/witness` 旧入口均为 200，并含预期新地址。真实浏览器打开带 v1 Fragment 的旧入口后落到 `/hx/f/`，Fragment 完整保留且请帖标题正确解析。

## 尚需真机验收

桌面和自动检查不能证明微信内置浏览器行为。正式大范围使用前至少验证：

1. iPhone 微信与一台主流安卓微信填写、生成、复制、发送、打开。
2. 来宾打开先到欢迎页，点击/上滑进入详情后音乐开始；暂停/恢复有效。
3. 微信聊天没有截断最大长度链接，也没有丢弃 `#` Fragment。
4. 旧根地址和至少一个旧 `/share/v2/.../` 链接能保留 Fragment 跳到新站。
5. 小屏、刘海屏、底部手势区、输入法弹起和长姓名/地址显示正常。
6. 只用这次新生成的 `q-z/0-5` 路径测试；`a-p` 可能仍保留此前灰图缓存。
7. 即使静态 OG、Baseline JPEG 和 body 首图均正确，微信也没有承诺普通 URL 一定采用它们；若新路径仍为空，官方级方案需要认证服务号、自有合规域名与服务端 JS-SDK 签名。

## 继续开发

新会话先读本文件，然后运行：

```powershell
npm run check
python -m http.server 4173
```

修改 `index.html`、音乐、图标或分享选项后先运行 `npm run build`。发布需把当前与旧版共 32 个生成页一并提交。
