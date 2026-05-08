# My Blog

基于 Hugo + PaperMod 的零成本个人博客，托管在 GitHub Pages。

## 技术栈

| 组件 | 技术 | 费用 |
|------|------|------|
| 站点生成 | Hugo Extended v0.161.1 | 免费 |
| 主题 | PaperMod | 免费 |
| 托管 | GitHub Pages | 免费 |
| 评论 | Giscus (GitHub Discussions) | 免费 |
| 统计 | GoatCounter | 免费 |
| 在线编辑 | Decap CMS | 免费 |

## 本地开发

### 前置条件

- [Hugo Extended](https://gohugo.io/installation/) >= 0.161.1
- [Git](https://git-scm.com/)

### 常用命令

```bash
# 创建新文章
hugo new content posts/my-post.md

# 本地预览（含草稿）
hugo server --buildDrafts

# 构建生产版本
hugo --minify
```

## 写作流程

### 方式一：本地 Markdown + Git

1. 用 VS Code 编辑 Markdown 文件
2. `git add && git commit && git push`
3. GitHub Actions 自动构建部署

### 方式二：在线 CMS 编辑

1. 访问 `https://yoursite.com/admin/`
2. 登录 GitHub 账号
3. 在线创建/编辑文章
4. 发布后自动触发部署

## 后续配置

### 1. 关联 GitHub 仓库

```bash
cd D:/Projects/blog
git remote add origin https://github.com/USERNAME/USERNAME.github.io.git
git push -u origin main
```

### 2. 启用 GitHub Pages

1. 进入仓库 Settings → Pages
2. Source 选择 "GitHub Actions"
3. 推送代码后自动部署

### 3. 配置 Giscus 评论

1. 访问 [giscus.app](https://giscus.app/)
2. 按指引配置 GitHub Discussions
3. 将生成的 `repo`, `repoId`, `category`, `categoryId` 填入 `hugo.toml` 的 `[params.comments.giscus]`

### 4. 配置 GoatCounter 统计

1. 访问 [goatcounter.com](https://www.goatcounter.com/) 注册
2. 获取你的 code（如 `yourblog`）
3. 填入 `hugo.toml` 的 `[params.analytics.goatcounter]` → `code = "yourblog"`

### 5. 配置 Decap CMS

1. 编辑 `static/admin/config.yml` 中的 `repo` 字段
2. 如需 OAuth，参考 [Decap CMS 文档](https://decapcms.org/docs/github-backend/)

## 项目结构

```
blog/
├── .github/workflows/    # GitHub Actions 部署
├── content/
│   ├── posts/            # 博客文章
│   ├── about.md          # 关于页面
│   ├── archives.md       # 归档页
│   └── search.md         # 搜索页
├── static/
│   └── admin/            # Decap CMS 在线编辑
├── themes/PaperMod/      # 主题（Git 子模块）
├── hugo.toml             # 站点配置
└── .gitignore
```
