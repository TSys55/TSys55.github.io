---
title: "Hugo 博客文章不显示？可能是时区问题"
date: 2026-05-08
categories: ["技术"]
tags: ["Hugo", "GitHub Actions", "时区", "踩坑"]
draft: false
comments: true
---

## 问题现象

用 Hugo 写博客时，新发布的文章出现了奇怪的现象：

- 文件已经提交并推送到 GitHub
- GitHub Actions 构建成功，页面正常生成
- 通过 CMS 编辑器能看到新文章
- 直接访问文章 URL 返回 404
- 首页文章列表里看不到新文章

## 排查过程

### 第一步：确认文件是否正确提交

```bash
git log --oneline -3
git show --stat HEAD
```

文件确实在仓库里，front matter 格式也正确：

```yaml
---
title: "文章标题"
date: 2026-05-09
categories: ["技术"]
tags: ["Hugo"]
draft: false
---
```

### 第二步：检查 GitHub Actions 构建

查看构建日志：

```
Start building sites …
hugo v0.161.1-extended

Pages            │ 32
Static files     │ 2

Total in 63 ms
```

构建成功，生成了 32 个页面，没有报错。

### 第三步：检查部署

build 和 deploy 两个 job 都显示 `success`，部署到 `github-pages` 环境也正常。

### 第四步：发现关键线索

仔细对比发现：

- **文章日期**：`date: 2026-05-09`
- **构建时间**：`2026-05-08T18:58:43Z`（UTC 时间）

文章日期是 5 月 9 日，但构建发生在 UTC 时间的 5 月 8 日。因为我在中国（UTC+8），本地时间是 5 月 9 日凌晨 2 点多，但 GitHub Actions 服务器在 UTC 时区，此时还是 5 月 8 日晚上。

## 根本原因

Hugo 默认**不会在列表页中显示未来日期的文章**。

```
本地时间：2026-05-09 02:58 (UTC+8)
服务器时间：2026-05-08 18:58 (UTC)
文章日期：2026-05-09
```

Hugo 的行为：

| 场景 | 单独访问 URL | 出现在首页列表 |
|---|---|---|
| 文章日期 ≤ 构建日期 | 可以 | 可以 |
| 文章日期 > 构建日期 | 可以（页面会构建） | 不可以 |

所以页面实际上被构建出来了（CMS 能看到，URL 理论上可访问），但不会出现在首页、分类、标签等列表页中。

## 解决方案

### 方案一：修改文章日期

将文章日期改为构建日期或更早的日期：

```yaml
date: 2026-05-08  # 改为当天或之前的日期
```

这是最直接的方法，但每次发文章都要注意时区差异。

### 方案二：启用 buildFuture（推荐）

在 `hugo.toml` 中添加配置：

```toml
buildFuture = true
```

这样 Hugo 会把所有日期的文章都显示出来，不受构建时间限制。对于个人博客来说这是最省心的方案。

### 方案三：在构建时指定时区

在 GitHub Actions 工作流中设置时区：

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    env:
      TZ: Asia/Shanghai
    steps:
      - name: Build
        run: hugo --minify
```

设置 `TZ` 环境变量后，Hugo 会使用指定时区来判断日期，构建时间就和本地时间一致了。

## 时区问题总结

| 场景 | 本地时间 | 服务器时间 (UTC) | 时差 |
|---|---|---|---|
| 北京时间凌晨发文 | 5月9日 02:00 | 5月8日 18:00 | +8 |
| 北京时间上午发文 | 5月9日 10:00 | 5月9日 02:00 | +8 |
| 北京时间晚上发文 | 5月9日 22:00 | 5月9日 14:00 | +8 |

只有在北京时间凌晨 0 点到 8 点之间发文时，才会遇到"本地是今天，UTC 还是昨天"的问题。

## 最佳实践

对于部署在 GitHub Actions 上的 Hugo 博客，推荐同时使用方案二和方案三：

**hugo.toml：**

```toml
buildFuture = true
```

**.github/workflows/deploy.yml：**

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    env:
      TZ: Asia/Shanghai
```

这样无论什么时间发文，都不会有时区问题。`buildFuture = true` 作为兜底，`TZ` 确保构建环境与作者时区一致。

## 扩展：Hugo 的日期处理机制

Hugo 处理日期的方式：

- `.Date`：文章的日期（来自 front matter）
- `.Lastmod`：最后修改日期
- `.PublishDate`：发布日期
- `.ExpiryDate`：过期日期

相关配置项：

```toml
# 构建未来日期的内容
buildFuture = true

# 构建已过期内容（默认为 true）
buildExpired = true

# 构建草稿内容（等同于 --buildDrafts）
buildDrafts = false
```

Hugo 不会修改文章的日期，它只是根据日期和构建时间的比较来决定是否在列表页中显示。即使文章不显示在列表中，页面文件仍然会被生成——这也是为什么直接访问 URL 可以看到内容，但首页找不到的原因。
