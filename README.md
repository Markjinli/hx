# 合禧请帖｜纯静态双页婚礼 H5

这是一个专为 GitHub Pages设计的无服务器婚礼请帖制作器。填写两位新人姓名、日期、时间和地点后，网页会生成一条专属链接。收到链接的来宾始终先看到欢迎封面，再开启婚礼详情页。

线上地址：<https://markjinli.github.io/hexi-wedding-invitation/>

## 功能

- 根网址打开制作表单
- 专属链接打开两页 H5：欢迎封面、婚礼详情
- 系统分享、复制链接和微信降级提示
- 刷新或转发后始终从欢迎封面开始
- 损坏、截断和未知版本链接显示明确错误页
- 纯 HTML/CSS/JavaScript，无服务器、数据库、Cookie、统计脚本或外部字体

## 链接协议

```text
#i=v1.<base64url(UTF-8 JSON)>.<CRC32>
```

个人信息只存在 URL Fragment 中，不随网页请求发送给 GitHub。CRC32仅用于发现链接截断或误改，并不提供加密或防篡改能力；拥有完整链接的人可以读取请帖内容。

字段、UTF-8 payload、token 和完整 URL 均有硬性长度限制。协议版本为 `v1`，以后可以在不错误解析旧链接的前提下演进。

## 本地预览

在本目录启动任意静态服务器，例如：

```powershell
python -m http.server 4173
```

打开 <http://localhost:4173/>。

## 检查

```powershell
npm run check
```

## 发布

仓库根目录就是发布目录，并包含 `.nojekyll`。GitHub Pages设置为从 `main` 分支的 `/ (root)` 发布，不依赖 GitHub Actions工作流。

继续开发前请先阅读 `HANDOFF.md`。
