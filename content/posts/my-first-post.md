---
title: "用 Hugo 搭建零成本博客"
date: 2026-05-08
categories: ["技术"]
tags: ["Hugo", "博客", "GitHub Pages"]
draft: false
comments: true
---

## 为什么选择 Hugo

Hugo 是目前最快的静态站点生成器，用 Go 编写，构建速度极快。配合 GitHub Pages，可以实现完全免费的博客托管。

## 零成本方案

| 组件 | 工具 | 费用 |
|------|------|------|
| 站点生成 | Hugo | 免费 |
| 主题 | PaperMod | 免费 |
| 托管 | GitHub Pages | 免费 |
| 域名 | *.github.io | 免费 |
| 评论 | Giscus | 免费 |
| 统计 | GoatCounter | 免费 |
| 在线编辑 | Decap CMS | 免费 |

## 快速开始

```bash
# 创建新文章
hugo new content posts/my-post.md

# 本地预览
hugo server --buildDrafts

# 构建生产版本
hugo --minify
```

## 下一步

- 配置 Giscus 评论系统
- 接入 GoatCounter 访问统计
- 设置 GitHub Actions 自动部署
