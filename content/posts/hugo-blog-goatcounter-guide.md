---
title: "Hugo 博客集成 GoatCounter 网站分析"
date: 2026-05-08
categories: ["技术"]
tags: ["Hugo", "GoatCounter", "网站分析", "隐私", "GitHub Pages"]
draft: false
comments: true
---

## 为什么选择 GoatCounter

大多数网站使用 Google Analytics 做访问统计，但它有明显的缺点：脚本体积大（50KB+）、需要 Cookie 同意弹窗、收集大量用户隐私数据。对于一个个人博客来说，这些都不必要。

[GoatCounter](https://www.goatcounter.com/) 是一个专注于隐私的轻量级网站分析工具，用 Go 编写，开源（AGPL-3.0）。

### 核心优势

| 特性 | GoatCounter | Google Analytics |
|---|---|---|
| 脚本体积 | ~2.5KB | ~50KB+ |
| Cookie | 不使用 | 需要 |
| GDPR 合规 | 默认合规 | 需要同意弹窗 |
| 数据存储 | 仅聚合统计 | 收集个人数据 |
| 免费额度 | 10 万次/月 | 无限制 |
| 数据保留 | 免费 6 个月 | 保留 14 个月 |
| 开源 | 是 | 否 |

### 适用场景

- 个人博客、静态站点
- 不想放 Cookie 同意弹窗的网站
- 注重访客隐私
- 需要简单直观的访问统计

## 注册账号

1. 打开 [goatcounter.com](https://www.goatcounter.com/)，点击 **Sign up**
2. 填写邮箱和密码注册
3. 点击 **Add new site**，创建一个站点
4. 创建后你会得到一个子域名，如 `yourcode.goatcounter.com`
5. 这个子域名前缀（`yourcode`）就是后面配置中用到的 **code**

不需要信用卡，注册即用。

## Hugo 集成配置

### 第一步：在 hugo.toml 中添加配置

在 Hugo 站点配置文件 `hugo.toml` 中添加：

```toml
[params.analytics]
  [params.analytics.goatcounter]
    code = "yourcode"  # 替换为你的 GoatCounter 子域名前缀
```

这就是 GoatCounter 的站点标识，后面模板会读取这个值。

### 第二步：创建模板文件

PaperMod 主题预留了 `extend_footer.html` 作为自定义脚本的注入点。在项目根目录创建：

```
layouts/partials/extend_footer.html
```

**注意**：不要直接修改 `themes/PaperMod/` 下的文件，否则主题更新时改动会丢失。Hugo 的覆盖机制会优先使用项目根目录下的同名文件。

文件内容：

```html
{{- if hugo.IsProduction }}
{{- with .Site.Params.analytics.goatcounter.code }}
<script data-goatcounter="https://{{ . }}.goatcounter.com/count"
        async src="//gc.zgo.at/count.js"></script>
<noscript>
  <img src="https://{{ . }}.goatcounter.com/count?p={{ $.RelPermalink }}"
       alt="" style="display:none">
</noscript>
{{- end }}
{{- end }}
```

### 模板说明

```html
{{- if hugo.IsProduction }}
```

只在正式构建时加载分析脚本。`hugo server` 本地开发时不会加载，避免污染统计数据。

```html
{{- with .Site.Params.analytics.goatcounter.code }}
```

读取 `hugo.toml` 中配置的 `code` 值。如果未配置则不渲染任何内容。

```html
<script data-goatcounter="..." async src="//gc.zgo.at/count.js"></script>
```

`async` 属性确保脚本异步加载，不阻塞页面渲染。`//gc.zgo.at` 使用协议相对路径，自动适配 HTTP/HTTPS。

```html
<noscript>
  <img src="..." alt="" style="display:none">
</noscript>
```

为禁用 JavaScript 的访客提供 1x1 透明像素追踪，确保统计完整性。

### 第三步：部署

提交代码并推送：

```bash
git add layouts/partials/extend_footer.html hugo.toml
git commit -m "集成 GoatCounter 网站分析"
git push
```

等待 GitHub Actions 构建完成后，访问博客任意页面，然后打开 GoatCounter 控制台确认数据是否正常接收。

## GoatCounter 控制台

访问 `https://yourcode.goatcounter.com` 进入管理面板。

### 概览页面

概览页面展示核心数据：

- **页面浏览量（Pageviews）**：总浏览次数
- **独立访客（Unique visitors）**：按会话去重后的访客数
- **趋势图表**：可按天、周、月查看变化趋势
- **对比功能**：可与上一时段对比，查看增长/下降百分比

### 数据维度

GoatCounter 自动收集以下维度的数据：

#### 页面统计

- 最受欢迎的页面排行
- 每个页面的浏览量和独立访客数
- 支持按路径筛选

#### 来源分析

- **搜索引擎**：Google、Bing、百度等
- **直接访问**：用户直接输入 URL 或书签访问
- **外部链接**：其他网站引荐的流量
- **社交媒体**：Twitter、微博等平台

#### 访客特征

- **浏览器**：Chrome、Firefox、Safari、Edge 等
- **操作系统**：Windows、macOS、Linux、iOS、Android
- **屏幕尺寸**：常见分辨率分布
- **地理位置**：国家级别的访问分布

### 实时查看

点击 **"Last"** 可以看到最近的访问记录，实时刷新，适合刚部署后验证数据是否正常接收。

## 高级配置

### 自定义事件追踪

除了自动统计页面浏览，还可以追踪自定义事件，比如按钮点击、文件下载等。

#### JavaScript API

```javascript
// 追踪自定义事件
goatcounter.count({
  path: '/click/download-button',
  event: true,
  title: '下载按钮点击'
});
```

参数说明：

| 参数 | 类型 | 说明 |
|---|---|---|
| `path` | string | 事件路径（必填） |
| `event` | boolean | 设为 `true` 标记为事件而非页面浏览 |
| `title` | string | 事件标题（可选） |

#### HTML 属性

更简单的方式是在元素上添加 `data-goatcounter-click` 属性：

```html
<!-- 追踪外部链接点击 -->
<a href="https://github.com/TSys55"
   data-goatcounter-click="/click/github-profile">GitHub</a>

<!-- 追踪文件下载 -->
<a href="/files/resume.pdf"
   data-goatcounter-click="/click/download-resume">下载简历</a>
```

点击该元素时，GoatCounter 会自动发送一次统计。

### window.goatcounter 配置项

在加载 GoatCounter 脚本之前，可以通过全局对象进行配置：

```javascript
window.goatcounter = {
  // 允许统计本地开发环境的访问（默认不统计 localhost）
  allow_local: true,

  // 自定义页面标题
  title: '自定义标题',

  // 自定义页面路径
  path: '/custom-path',

  // 禁用页面加载时的自动统计（适用于 SPA）
  no_onload: true,

  // 设置referrer策略
  referrer: 'no-referrer'
};
```

### 过滤设置

在 GoatCounter 控制台的 **Settings** 页面可以配置过滤规则：

- **排除路径**：不统计某些路径，如 `/admin/*`、`/static/*`
- **Bot 过滤**：自动过滤已知爬虫（默认开启）
- **排除自己的访问**：在控制台中标记自己的会话为 "bot"，后续该浏览器的访问不再统计

### 排除自己的访问

最简单的方式是访问你的 GoatCounter 控制台，点击页面底部的 **"mark as bot"** 链接。GoatCounter 会在你的浏览器中设置一个标记，之后该浏览器的访问将被过滤。

## 数据导出与备份

免费版数据保留 6 个月，如果需要长期保存数据，可以定期导出备份。

### 通过控制台导出

在控制台 **Settings → Export** 页面，点击导出按钮即可下载 CSV 格式的数据。

### 通过 API 导出

```bash
# 创建导出任务
curl -X POST "https://yourcode.goatcounter.com/api/v0/export" \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_API_TOKEN'

# 查询导出状态
curl "https://yourcode.goatcounter.com/api/v0/export/{id}" \
  -H 'Authorization: Bearer YOUR_API_TOKEN'

# 下载导出文件
curl "https://yourcode.goatcounter.com/api/v0/export/{id}/download" \
  -H 'Authorization: Bearer YOUR_API_TOKEN' | gzip -d
```

API Token 在控制台 **用户名 → API** 页面创建。

### 增量导出

导出结果包含 `last_hit_id` 字段，下次导出时可以指定起始位置：

```bash
curl -X POST "https://yourcode.goatcounter.com/api/v0/export" \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_API_TOKEN' \
  --data '{"start_from_hit_id": 12345}'
```

可以结合 cron 定时任务实现自动备份。

## 自建 GoatCounter

如果不想依赖第三方服务，GoatCounter 支持自建部署，所有功能免费，无访问量限制。

### Docker 部署

```bash
docker run -d \
  --name goatcounter \
  -p 8080:443 \
  -v goatcounter-db:/var/lib/goatcounter \
  ghcr.io/arp242/goatcounter:latest \
  serve -db sqlite3+/var/lib/goatcounter/goatcounter.db \
       -listen 0.0.0.0:443 \
       -tls http
```

### 反向代理

生产环境建议放在反向代理后面。以 Caddy 为例（自动 HTTPS）：

```
analytics.yourdomain.com {
    reverse_proxy localhost:8080
}
```

### 自建 vs 云服务

| 对比项 | 云服务 | 自建 |
|---|---|---|
| 成本 | 免费（10 万次/月） | 服务器费用 |
| 维护 | 零维护 | 需要自己维护 |
| 数据保留 | 免费 6 个月 | 无限制 |
| 访问量 | 付费后无限制 | 无限制 |
| 适合 | 个人博客 | 有运维能力的用户 |

对于个人博客，云服务的免费额度完全够用，推荐直接用云服务。

## 价格方案

| 方案 | 价格 | 页面浏览量 | 数据保留 |
|---|---|---|---|
| 免费 | $0 | 10 万次/月 | 6 个月 |
| 个人版 | $5/月 或 $50/年 | 无限制 | 无限制 |
| 商业版 | $10/月 或 $100/年 | 无限制 | 无限制 + 优先支持 |
| 自建 | 服务器费用 | 无限制 | 无限制 |

## 实用技巧

### 1. 验证统计是否生效

部署后打开浏览器开发者工具（F12），切换到 **Network** 标签页，刷新页面，查找对 `yourcode.goatcounter.com/count` 的请求。如果状态码为 200 或 202，说明统计正常工作。

### 2. 本地开发不污染数据

模板中已使用 `hugo.IsProduction` 条件判断，`hugo server` 本地开发时不会加载统计脚本。如果确实需要在本地测试，可以在浏览器控制台手动执行：

```javascript
window.goatcounter = { allow_local: true };
```

### 3. 查看实时数据

部署后立即访问 GoatCounter 控制台的 **"Last"** 页面，确认有新的访问记录出现。

### 4. 隐私声明

建议在博客的"关于"页面添加说明，告知读者站点使用了隐私友好的分析工具：

> 本站使用 [GoatCounter](https://www.goatcounter.com/) 进行访问统计。GoatCounter 不使用 Cookie，不收集个人数据，符合 GDPR 要求。

### 5. 与其他工具共存

GoatCounter 的异步加载机制不会与 Giscus 评论、Fuse.js 搜索等其他第三方组件产生冲突。脚本仅 2.5KB，对页面性能几乎没有影响。

### 6. 定期备份数据

免费版数据保留 6 个月，建议设置每月一次的导出任务，将数据保存到本地或 GitHub 仓库中。

## 总结

GoatCounter 是个人博客的理想分析工具——轻量、注重隐私、零成本、配置简单。整个集成过程只需要一个配置项和一个模板文件，几行代码即可完成。

对于 Hugo + PaperMod 博客，利用 `extend_footer.html` 覆盖机制集成 GoatCounter 是最优雅的方式，既不影响主题更新，又能保持项目结构清晰。
