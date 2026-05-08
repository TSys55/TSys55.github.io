# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hugo + PaperMod personal blog, deployed to GitHub Pages at zero cost. Chinese-language site (`defaultContentLanguage = "zh"`).

## Commands

```bash
# Local dev server (includes drafts)
hugo server --buildDrafts

# Create new post
hugo new content posts/my-post.md

# Production build
hugo --minify
```

## Architecture

- **Static site generator**: Hugo Extended v0.161.1
- **Theme**: PaperMod (Git submodule at `themes/PaperMod/`)
- **Deploy**: GitHub Actions → GitHub Pages (workflow at `.github/workflows/deploy.yml`, triggers on push to `main`)
- **Online editing**: Decap CMS at `static/admin/` (config in `static/admin/config.yml`)
- **Search**: Client-side via Fuse.js (configured in `[params.fuse]` in hugo.toml)
- **Outputs**: HTML + RSS + JSON (JSON required for Fuse.js search index)

## Key Configuration

All site config lives in `hugo.toml` at the repo root. Theme overrides go in `themes/PaperMod/` (submodule — do not edit directly; fork if customization needed).

## Content Structure

- `content/posts/` — blog articles (Markdown with front matter: title, date, categories, tags, draft)
- `content/about.md`, `content/archives.md`, `content/search.md` — standalone pages
- Draft posts have `draft: true` in front matter; only published when `--buildDrafts` is omitted

## Deployment

Push to `main` triggers GitHub Actions: checkout (with submodules) → Hugo build → deploy to GitHub Pages. The `master` branch is the working branch; PRs merge into `main` for deployment.

## Still Needs Configuration

These values in `hugo.toml` are placeholders to be filled by the user:
- `baseURL` — GitHub Pages URL
- `[params.comments.giscus]` — repo/repoId/category/categoryId for comments
- `[params.analytics.goatcounter]` — code for analytics
- `[params.editPost].URL` — "Suggest Changes" link
- `static/admin/config.yml` → `repo` — GitHub repo for Decap CMS
