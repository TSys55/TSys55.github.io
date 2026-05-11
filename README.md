# TSys55 Blog

基于 Hugo + PaperMod 的零成本个人博客，部署在 GitHub Pages。

## 技术架构

```
┌─────────────┐     git push      ┌──────────────────┐     build     ┌──────────────┐
│  本地编辑    │ ────────────────→ │  GitHub Actions   │ ───────────→ │  GitHub Pages │
│  / CMS      │                   │  (deploy.yml)     │              │  静态托管      │
└─────────────┘                   └──────────────────┘              └──────┬───────┘
                                                                           │
                                          ┌────────────────────────────────┤
                                          │                                │
                                    ┌─────┴─────┐                  ┌─────┴─────┐
                                    │  Giscus    │                  │ GoatCounter│
                                    │  评论系统   │                  │  访问统计   │
                                    └───────────┘                  └───────────┘
```

| 组件 | 技术方案 | 费用 |
|------|---------|------|
| 静态站点生成 | Hugo Extended v0.161.1 | 免费 |
| 主题 | PaperMod | 免费 |
| 托管 | GitHub Pages | 免费 |
| 评论 | Giscus（基于 GitHub Discussions） | 免费 |
| 访问统计 | GoatCounter | 免费 |
| 在线编辑 | Sveltia CMS（Decap CMS 继任者） | 免费 |
| OAuth 代理 | Cloudflare Workers | 免费 |
| 站内搜索 | Fuse.js（客户端搜索） | 免费 |

---

## 前置条件

- [Hugo Extended](https://gohugo.io/installation/) >= 0.161.1（注意必须是 **Extended** 版本）
- [Git](https://git-scm.com/)
- GitHub 账号

验证 Hugo 版本：

```bash
hugo version
# 应输出类似：hugo v0.161.1+extended ...
```

---

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/TSys55/TSys55.github.io.git
cd TSys55.github.io
```

> 项目使用 Git 子模块管理 PaperMod 主题，克隆时会自动拉取。如子模块缺失，执行：
> ```bash
> git submodule update --init --recursive
> ```

### 2. 本地预览

```bash
# 启动开发服务器（包含草稿文章）
hugo server --buildDrafts

# 浏览器打开 http://localhost:1313
```

### 3. 创建文章

```bash
hugo new content posts/my-new-post.md
```

这会基于 `archetypes/default.md` 模板在 `content/posts/` 下生成文件，默认为草稿状态（`draft: true`）。

### 4. 构建与部署

```bash
# 生产构建（输出到 public/ 目录）
hugo --minify
```

推送到 `main` 分支后，GitHub Actions 自动构建并部署到 GitHub Pages。

---

## 写作流程

### 方式一：本地 Markdown + Git

1. 用编辑器（VS Code 等）在 `content/posts/` 下创建或编辑 `.md` 文件
2. 编辑 front matter（标题、日期、分类、标签）
3. 撰写 Markdown 正文
4. 提交并推送：

```bash
git add content/posts/my-post.md
git commit -m "feat: 添加新文章"
git push
```

### 方式二：在线 CMS 编辑

1. 访问 `https://tsys55.github.io/admin/`
2. 通过 GitHub OAuth 登录
3. 在 CMS 界面中创建/编辑/发布文章
4. 保存后自动触发 GitHub Actions 部署

---

## 内容格式

### Front Matter 字段

每篇文章的 Markdown 文件头部包含 YAML front matter：

```yaml
---
title: "文章标题"
date: 2026-05-08
categories:
  - 技术
tags:
  - Hugo
  - Blog
draft: false
comments: true
---
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `title` | 是 | 文章标题 |
| `date` | 是 | 发布日期，格式 `YYYY-MM-DD` |
| `categories` | 否 | 分类（列表） |
| `tags` | 否 | 标签（列表） |
| `draft` | 否 | `true` 为草稿，不会被发布 |
| `comments` | 否 | `true` 启用 Giscus 评论 |

### 独立页面

`content/` 根目录下的文件为独立页面：

| 文件 | 访问路径 | 用途 |
|------|---------|------|
| `about.md` | `/about/` | 关于页面 |
| `archives.md` | `/archives/` | 文章归档 |
| `search.md` | `/search/` | 站内搜索 |

---

## 项目结构

```
blog/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions 自动部署
├── archetypes/
│   └── default.md              # 文章模板
├── assets/                     # Hugo Pipes 资源（CSS/JS 等）
├── content/
│   ├── posts/                  # 博客文章
│   ├── about.md                # 关于页
│   ├── archives.md             # 归档页
│   └── search.md               # 搜索页
├── data/                       # 数据文件
├── i18n/                       # 国际化翻译
├── layouts/
│   └── partials/
│       └── extend_footer.html  # 自定义页脚（GoatCounter 统计）
├── static/
│   ├── admin/
│   │   ├── config.yml          # Sveltia CMS 配置
│   │   └── index.html          # CMS 入口页
│   └── img/                    # 图片等静态资源
├── themes/
│   └── PaperMod/               # 主题（Git 子模块，勿直接修改）
├── hugo.toml                   # 站点主配置
└── .gitignore
```

---

## 配置详解

所有配置集中在 `hugo.toml`，以下是各部分说明。

### 基础设置

```toml
baseURL = "https://tsys55.github.io/"    # 站点 URL
title = "My Blog"                         # 站点标题
paginate = 10                              # 每页文章数
theme = "PaperMod"                         # 主题名称
defaultContentLanguage = "zh"              # 默认语言（中文）
hasCJKLanguage = true                      # 启用 CJK 字数统计
buildFuture = true                         # 允许发布未来日期的文章
```

### 功能开关

```toml
ShowReadingTime = true        # 显示阅读时长
ShowPostNavLinks = true       # 显示上下篇文章导航
ShowBreadCrumbs = true        # 显示面包屑导航
ShowCodeCopyButtons = true    # 代码块显示复制按钮
ShowWordCount = true          # 显示字数
UseHugoToc = true             # 使用 Hugo 内置目录
```

### 导航菜单

```toml
[[menu.main]]
  identifier = "home"
  name = "首页"
  url = "/"
  weight = 1
```

通过 `weight` 控制菜单顺序，数字越小越靠前。

### 代码高亮

```toml
[markup.highlight]
  style = "dracula"       # 高亮主题
  codeFences = true        # 支持 ``` 代码围栏
  guessSyntax = true       # 自动检测语言
  lineNos = false          # 不显示行号（可按需开启）
```

支持的主题列表见 [Hugo 文档](https://gohugo.io/functions/highlight/)。

### 搜索配置

站内搜索基于 Fuse.js，配置在 `[params.fuse]` 中：

```toml
[params.fuse]
  isCaseSensitive = false     # 不区分大小写
  minMatchCharLength = 2      # 最小匹配字符数
  threshold = 0.3             # 匹配阈值（越小越精确）
  ignoreLocation = true       # 忽略匹配位置
```

搜索功能需要在 `[outputs]` 中启用 JSON 输出：

```toml
[outputs]
  home = ["HTML", "RSS", "JSON"]
```

---

## 功能配置指南

### Giscus 评论

评论系统基于 GitHub Discussions，通过 Giscus 服务实现。

1. 访问 [giscus.app](https://giscus.app/)，按页面指引操作
2. 选择仓库 → 启用 Discussions → 选择映射方式
3. 将生成的参数填入 `hugo.toml`：

```toml
[params.comments]
  enable = true
  [params.comments.giscus]
    repo = "TSys55/TSys55.github.io"
    repoId = "你的 repoId"
    category = "博客评论"
    categoryId = "你的 categoryId"
    mapping = "pathname"
    theme = "preferred_color_scheme"
    lang = "zh-CN"
```

### GoatCounter 访问统计

GoatCounter 是一个轻量、隐私友好的访问统计服务。

1. 在 [goatcounter.com](https://www.goatcounter.com/) 注册账号
2. 获取你的 code（如 `tsys55`）
3. 配置 `hugo.toml`：

```toml
[params.analytics]
  [params.analytics.goatcounter]
    code = "tsys55"
```

统计脚本在 `layouts/partials/extend_footer.html` 中加载，仅在生产环境生效，不会影响本地开发。

### Sveltia CMS 在线编辑

CMS 配置文件位于 `static/admin/`，包含：

- `index.html` — CMS 入口页，加载 Sveltia CMS 的 JS
- `config.yml` — CMS 配置，定义了内容类型和编辑字段

关键配置项：

```yaml
backend:
  name: github
  repo: "TSys55/TSys55.github.io"    # GitHub 仓库
  branch: main                        # 部署分支
  base_url: https://sveltia-cms-auth.xxx.workers.dev  # OAuth 代理地址
  app_id: "你的 Client ID"            # GitHub OAuth App ID
```

如需修改 OAuth 配置或内容模型，编辑 `static/admin/config.yml` 即可。

---

## 部署流程

### 自动部署（推荐）

推送代码到 `main` 分支即可触发自动部署：

```
git push origin main
```

GitHub Actions 工作流（`.github/workflows/deploy.yml`）会执行：

1. **Checkout** — 拉取代码（含子模块）
2. **Setup Hugo** — 安装 Hugo Extended 0.161.1
3. **Build** — 执行 `hugo --minify`
4. **Deploy** — 将 `public/` 目录部署到 GitHub Pages

支持手动触发：在 GitHub 仓库的 Actions 页面点击 "Run workflow"。

### 本地构建验证

推送前可在本地验证构建结果：

```bash
hugo --minify
# 检查 public/ 目录下的输出
```

---

## 自定义与扩展

### 修改主题样式

PaperMod 是 Git 子模块，**不要直接修改** `themes/PaperMod/` 下的文件。正确做法：

1. 用 `layouts/` 目录下的同名文件覆盖主题模板
2. 用 `assets/` 目录添加自定义 CSS/JS
3. 如需深度定制，Fork PaperMod 后修改 `hugo.toml` 中的主题路径

### 添加自定义页脚内容

编辑 `layouts/partials/extend_footer.html`，该文件会自动加载在页面底部。

### 修改文章模板

编辑 `archetypes/default.md` 可自定义 `hugo new` 生成的文件模板。

---

## 常用命令速查

| 命令 | 说明 |
|------|------|
| `hugo server --buildDrafts` | 本地预览（含草稿） |
| `hugo server` | 本地预览（仅已发布文章） |
| `hugo new content posts/xxx.md` | 创建新文章 |
| `hugo --minify` | 生产构建 |
| `hugo list all` | 列出所有文章 |
| `hugo list drafts` | 列出草稿 |
| `git submodule update --init --recursive` | 初始化/更新主题子模块 |

---

## 常见问题

### 本地预览文章不显示

- 检查 front matter 中 `draft` 是否为 `true`，需要加 `--buildDrafts` 参数
- 检查 `date` 是否是未来日期，需要 `buildFuture = true`

### 推送后 GitHub Pages 未更新

- 检查 GitHub Actions 页面是否有报错
- 确认推送的是 `main` 分支
- 确认 GitHub Pages 设置中 Source 选择了 "GitHub Actions"

### CMS 登录失败

- 检查 OAuth App 的回调地址是否正确指向 Cloudflare Worker 的 `/callback` 路径
- 确认 Worker 环境变量 `GITHUB_CLIENT_ID` 和 `GITHUB_CLIENT_SECRET` 已配置
- 尝试用无痕窗口登录（排除缓存问题）

### 代码高亮不生效

- 确认安装的是 Hugo **Extended** 版本（`hugo version` 输出中应有 `+extended`）
- 确认 `hugo.toml` 中 `markup.highlight.codeFences = true`

### 搜索功能不可用

- 确认 `hugo.toml` 中 `[outputs]` 包含 `"JSON"`
- 检查 `content/search.md` 是否存在
