---
title: "为 Hugo 博客配置在线编辑系统"
date: 2026-05-09
categories: ["技术"]
tags: ["Hugo", "Decap CMS", "Sveltia CMS", "OAuth", "Cloudflare Workers"]
draft: false
comments: true
---

## 为什么需要在线编辑

用 Hugo 写博客通常在本地用 Markdown 编辑，然后 `git push` 部署。但有时候只想快速改个错别字或发一篇短文，不想打开电脑、拉代码、编辑、提交——能不能像用 WordPress 一样在浏览器里直接写文章？

答案是可以，用 **Sveltia CMS**（原 Decap CMS）就能实现。

## 什么是 Sveltia CMS

Sveltia CMS 是 Decap CMS 的官方继任者。它是一个纯前端的 Git-based CMS，直接在你的 GitHub 仓库上读写 Markdown 文件，不需要后端数据库。用户在浏览器里编辑内容，CMS 通过 GitHub API 提交 commit，触发 GitHub Actions 自动部署。

> 注意：Decap CMS 已停止维护，npm 上的包已不可用，请直接使用 Sveltia CMS。

## 整体架构

```
浏览器 (Sveltia CMS)
    ↓ OAuth 登录
Cloudflare Workers (OAuth 代理)
    ↓
GitHub OAuth App
    ↓ 回调
Cloudflare Workers (换取 Token)
    ↓
浏览器 (获得访问权限，通过 GitHub API 操作仓库)
```

核心思路：Sveltia CMS 运行在浏览器中，通过 GitHub API 读写仓库内容。但 OAuth 认证需要一个中间代理服务来处理 Token 交换。

## 第一步：创建 GitHub OAuth App

1. 打开 [GitHub Developer Settings](https://github.com/settings/applications/new)
2. 填写以下信息：

| 字段 | 值 |
|---|---|
| Application name | 随意，如 `My Blog CMS` |
| Homepage URL | `https://你的用户名.github.io` |
| Authorization callback URL | 先留空，后面会改 |

3. 点击 **Register application**
4. 记下 **Client ID**
5. 点击 **Generate a new client secret**，记下 **Client Secret**（只显示一次）

## 第二步：部署 OAuth 代理（Cloudflare Workers）

因为 GitHub Pages 不是 Netlify 托管，不能直接使用 Netlify 的 OAuth 服务，需要自己部署一个代理。

### 使用 sveltia-cms-auth

[sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth) 是官方提供的 Cloudflare Workers 脚本，专门用于 Sveltia CMS 的 GitHub OAuth 认证。

1. 打开 [sveltia-cms-auth 仓库](https://github.com/sveltia/sveltia-cms-auth)
2. 点击 **"Deploy to Cloudflare Workers"** 一键部署
3. 部署完成后，在 Cloudflare 控制台 → Workers & Pages 中找到你的 Worker，记下 URL，格式类似：
   ```
   https://sveltia-cms-auth.你的ID.workers.dev
   ```
4. 进入 Worker 的 **Settings → Variables and Secrets**，添加环境变量：

| 变量名 | 值 |
|---|---|
| `GITHUB_CLIENT_ID` | 你的 Client ID |
| `GITHUB_CLIENT_SECRET` | 你的 Client Secret |

5. 保存后重新部署 Worker

## 第三步：更新 GitHub OAuth App 回调地址

回到 GitHub OAuth App 设置页，将 **Authorization callback URL** 改为：

```
https://sveltia-cms-auth.你的ID.workers.dev/callback
```

## 第四步：配置 Sveltia CMS

### 4.1 创建 admin 页面

在项目中创建 `static/admin/index.html`：

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex" />
  <title>Content Manager</title>
</head>
<body>
  <script src="https://cdn.jsdelivr.net/npm/@sveltia/cms/dist/sveltia-cms.js"></script>
</body>
</html>
```

> 注意：`decap-cms` 包已从 npm 移除，必须使用 `@sveltia/cms`。国内推荐使用 jsdelivr CDN。

### 4.2 创建配置文件

创建 `static/admin/config.yml`：

```yaml
backend:
  name: github
  repo: "你的用户名/仓库名"
  branch: main
  base_url: https://sveltia-cms-auth.你的ID.workers.dev
  app_id: "你的Client ID"

media_folder: "static/img"
public_folder: "/img"

collections:
  - name: "posts"
    label: "文章"
    folder: "content/posts"
    create: true
    slug: "{{slug}}"
    fields:
      - { label: "标题", name: "title", widget: "string" }
      - { label: "日期", name: "date", widget: "datetime", format: "YYYY-MM-DD", date_format: "YYYY-MM-DD" }
      - { label: "分类", name: "categories", widget: "list", default: ["技术"] }
      - { label: "标签", name: "tags", widget: "list", default: [] }
      - { label: "草稿", name: "draft", widget: "boolean", default: false }
      - { label: "正文", name: "body", widget: "markdown" }

  - name: "pages"
    label: "页面"
    folder: "content"
    create: true
    slug: "{{slug}}"
    fields:
      - { label: "标题", name: "title", widget: "string" }
      - { label: "日期", name: "date", widget: "datetime", format: "YYYY-MM-DD", date_format: "YYYY-MM-DD" }
      - { label: "草稿", name: "draft", widget: "boolean", default: false }
      - { label: "正文", name: "body", widget: "markdown" }
```

### 4.3 配置说明

| 字段 | 说明 |
|---|---|
| `repo` | GitHub 仓库，格式 `用户名/仓库名` |
| `branch` | 部署分支，通常是 `main` |
| `base_url` | OAuth 代理地址 |
| `app_id` | GitHub OAuth App 的 Client ID |
| `collections` | 定义可编辑的内容类型 |
| `media_folder` | 图片等媒体文件存储目录 |

## 第五步：部署测试

提交并推送代码：

```bash
git add static/admin/
git commit -m "配置 Sveltia CMS 在线编辑"
git push
```

等待 GitHub Actions 构建完成后，访问 `https://你的用户名.github.io/admin/`，应该能看到 GitHub 登录页面。授权登录后即可进入 CMS 管理界面。

## 踩坑记录

### 1. Decap CMS 的 npm 包已不可用

最初使用 `decap-cms` 包，但 npm 上已经找不到该包（返回 404）。改用继任者 `@sveltia/cms`。

### 2. unpkg CDN 在国内访问困难

`unpkg.com` 加载缓慢甚至超时，改为 `cdn.jsdelivr.net` 解决。

### 3. PKCE 认证方式不支持 GitHub

Sveltia CMS 支持 PKCE（无需 OAuth 代理），但 GitHub OAuth 不支持 PKCE 流程，会报错：

```
PKCE authorization is not yet supported due to GitHub's limitations.
```

必须使用 OAuth 代理方案。

### 4. Netlify OAuth 端点仅限 Netlify 托管站点

`https://api.netlify.com` 的 OAuth 服务只对 Netlify 托管的站点生效，GitHub Pages 站点使用会返回 404。

### 5. OAuth 回调后跳转到首页

登录成功后没有进入 CMS 管理界面，而是跳回了博客首页。原因是 GitHub OAuth App 的 **Authorization callback URL** 没有正确设置为 Worker 的 `/callback` 路径。修改后问题解决。

### 6. 浏览器缓存干扰

修改 CMS 配置后，浏览器可能缓存了旧的 JS 文件。建议用无痕窗口测试，或清除缓存后重试。

## 最终方案总结

| 组件 | 选择 | 原因 |
|---|---|---|
| CMS | Sveltia CMS | Decap CMS 继任者，仍在维护 |
| OAuth 代理 | Cloudflare Workers (sveltia-cms-auth) | 免费、官方支持、部署简单 |
| CDN | jsdelivr | 国内可访问，稳定 |
| 认证方式 | GitHub OAuth App + 代理 | GitHub Pages 站点的标准方案 |

整个配置过程零成本，Cloudflare Workers 免费额度完全够用。配置完成后，只需要访问 `/admin/` 就能在浏览器里写文章、上传图片，保存后自动触发部署，体验和传统 CMS 几乎一样。
