---
title: Hugo 博客显示文章浏览次数 + GoatCounter 数据自动备份
date: 2026-05-11
categories:
  - 技术
tags:
  - Hugo
  - GoatCounter
  - PaperMod
  - GitHub Actions
  - 网站分析
draft: false
comments: true
---

在上一篇文章中，我们为博客集成了 GoatCounter 做访问统计。这次我们要做两件事：

1. 在每篇文章的 meta 区域显示浏览次数（如 `128 次浏览`）
2. 定期自动备份 GoatCounter 数据，防止免费版 6 个月数据过期丢失

## 最终效果

文章标题下方的 meta 区域会显示：

```
2026-05-11 · 3 分钟 · 580 字 · TSys55 · 128 次浏览
```

浏览次数通过 JavaScript 从 GoatCounter API 动态获取，不影响静态页面的构建速度。

---

## 功能一：显示文章浏览次数

### 技术方案

GoatCounter 提供了一个公开的 JSON 端点，可以获取任意路径的浏览次数：

```
GET https://YOURCODE.goatcounter.com/counter/{path}.json
返回: { "count": "128" }
```

数据缓存 30 分钟，对于个人博客来说足够实时。整个过程分三步：创建占位符 → 页面加载时获取数据 → 替换占位符。

### 前提：启用访客计数

登录 GoatCounter 控制台 → **Settings** → 勾选 **"Allow adding visitor counts on your website"**。默认关闭，不开启的话 JSON API 返回 403。

### Step 1：覆盖 PaperMod 的 post_meta 模板

PaperMod 主题的文章 meta 信息（日期、阅读时间、字数）由 `post_meta.html` 控制。利用 Hugo 的覆盖机制，在项目根目录创建同名文件即可替换主题模板。

创建 `layouts/partials/post_meta.html`：

```html
{{- $scratch := newScratch }}

{{- if not .Date.IsZero -}}
    {{- $scratch.Add "meta" (slice (printf "<span title='%s'>%s</span>" (.Date) (.Date | time.Format (default ":date_long" site.Params.DateFormat)))) }}
{{- end }}

{{- if (.Param "ShowReadingTime") -}}
    {{- $scratch.Add "meta" (slice (printf "<span>%s</span>" (i18n "read_time" .ReadingTime | default (printf "%d min" .ReadingTime)))) }}
{{- end }}

{{- if (.Param "ShowWordCount") -}}
    {{- $scratch.Add "meta" (slice (printf "<span>%s</span>" (i18n "words" .WordCount | default (printf "%d words" .WordCount)))) }}
{{- end }}

{{- if not (.Param "hideAuthor") -}}
    {{- with (partial "author.html" .) }}
        {{- $scratch.Add "meta" (slice (printf "<span>%s</span>" .)) }}
    {{- end }}
{{- end }}

{{- /* 浏览次数占位符，JS 会在页面加载后替换为实际数字 */ -}}
{{- if and hugo.IsProduction site.Params.analytics.goatcounter.code (not .Params.hideViews) -}}
    {{- $gcViews := printf `<span class="gc-views" data-page-path="%s">-- %s</span>` .RelPermalink (i18n "views" 1 | default "次浏览") -}}
    {{- $scratch.Add "meta" (slice $gcViews) -}}
{{- end }}

{{- with ($scratch.Get "meta") }}
    {{- delimit . "&nbsp;·&nbsp;" | safeHTML -}}
{{- end -}}
```

关键点：

- 只在生产环境（`hugo.IsProduction`）渲染占位符，`hugo server` 本地开发时不显示
- 通过 `data-page-path` 属性传递文章路径给 JavaScript
- 如果某篇文章不想显示浏览次数，在 front matter 中设置 `hideViews: true`

### Step 2：添加 JavaScript 获取浏览次数

在已有的 `layouts/partials/extend_footer.html` 中追加代码，利用 GoatCounter 的 counter JSON API 获取数据：

```html
{{- if hugo.IsProduction }}
{{- with .Site.Params.analytics.goatcounter.code }}
<script data-goatcounter="https://{{ . }}.goatcounter.com/count"
        async src="//gc.zgo.at/count.js"></script>
<noscript>
  <img src="https://{{ . }}.goatcounter.com/count?p={{ $.RelPermalink }}"
       alt="" style="display:none">
</noscript>
<script>
(function() {
  var code = '{{ . }}';
  var els = document.querySelectorAll('.gc-views');
  if (!els.length) return;
  els.forEach(function(el) {
    var raw = el.getAttribute('data-page-path').replace(/\/$/, '');
    var r = new XMLHttpRequest();
    r.open('GET', 'https://' + code + '.goatcounter.com/counter/'
           + encodeURIComponent(raw).replace(/%2F/g, '/') + '.json', true);
    r.onload = function() {
      if (this.status === 200) {
        try {
          var d = JSON.parse(this.responseText);
          el.innerText = d.count + ' 次浏览';
          el.style.opacity = '1';
        } catch(e) {
          el.style.display = 'none';
        }
      } else {
        el.style.display = 'none';
      }
    };
    r.onerror = function() { el.style.display = 'none'; };
    r.send();
  });
})();
</script>
{{- end }}
{{- end }}
```

逻辑说明：

1. 查找所有 `.gc-views` 占位符元素
2. 从 `data-page-path` 读取文章路径
3. 去掉末尾斜杠，拼接 JSON API URL
4. 获取成功则替换为 `"128 次浏览"`，失败则隐藏元素（静默降级）

### Step 3：添加中文翻译

创建 `i18n/zh.yaml`：

```yaml
- id: views
  translation: "次浏览"
```

Hugo 会自动将项目级翻译与主题翻译合并，`i18n "views"` 即可获取 `"次浏览"`。

---

## 功能二：GoatCounter 数据自动备份

GoatCounter 免费版数据保留 6 个月，过期后无法恢复。通过 GitHub Actions 定时备份，将数据持久化到仓库中。

### 备份内容

| 文件 | 格式 | 内容 | 数据来源 |
|------|------|------|---------|
| `YYYY-MM-DD.json` | JSON | 每个页面的浏览次数统计 | Counter JSON API |
| `YYYY-MM-DD-raw.csv` | CSV | 每次访问的明细记录 | Export API |

### 创建备份脚本

创建 `scripts/gc-backup.py`，核心逻辑：

```python
def backup_page_views_json(date_str):
    """通过 counter JSON 端点获取每个页面的浏览次数"""
    # 扫描 content/ 目录获取所有文章路径
    page_paths = ["/"]
    for root, dirs, files in os.walk("content"):
        for f in files:
            if not f.endswith(".md"):
                continue
            rel = os.path.relpath(os.path.join(root, f), "content")
            rel = "/" + rel.replace("\\", "/").replace(".md", "/")
            page_paths.append(rel)
    page_paths.append("TOTAL")  # 站点总量

    # 逐个获取浏览次数
    for path in page_paths:
        data = counter_json(path.rstrip("/"))
        # data = {"count": "128"}

def backup_csv_raw(date_str):
    """通过 Export API 导出原始访问明细"""
    # 创建导出任务
    resp, status = api_post("/export", {"format": "csv"})
    # 轮询等待完成
    # 下载 CSV（gzip 压缩）
    # 支持增量导出（start_from_hit_id）
```

脚本使用 Python 标准库（`urllib`、`json`、`gzip`），无需安装额外依赖。

### 创建 GitHub Actions 工作流

创建 `.github/workflows/goatcounter-backup.yml`：

```yaml
name: GoatCounter Backup

on:
  schedule:
    - cron: '0 3 * * 0'    # 每周日 03:00 UTC
  workflow_dispatch:          # 支持手动触发
    inputs:
      days:
        description: '备份数据天数（0 = 全部）'
        default: '7'

permissions:
  contents: write

jobs:
  backup:
    runs-on: ubuntu-latest
    env:
      GC_CODE: tsys55
      GC_TOKEN: ${{ secrets.GOATCOUNTER_API_TOKEN }}
    steps:
      - uses: actions/checkout@v4
      - run: python3 scripts/gc-backup.py
      - run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/goatcounter-backup/
          git diff --cached --quiet && exit 0
          git commit -m "chore: GoatCounter backup $(date +%Y-%m-%d)"
          git push
```

### 配置 API Token

1. 登录 GoatCounter → 用户名 → **API Tokens** → 创建新 Token
2. 在 GitHub 仓库 → **Settings** → **Secrets and variables** → **Actions** → 添加：
   - Name: `GOATCOUNTER_API_TOKEN`
   - Value: 你的 API Token

### CSV 导出的额外设置

CSV 明细导出需要在 GoatCounter 控制台 → **Settings** → 启用 **"Collect individual pageviews"**（默认关闭）。

> 启用前收集的访问数据不会出现在 CSV 导出中，仅 JSON 统计备份包含所有历史数据。

---

## 踩坑记录

### 1. GoatCounter 公开 API 范围有限

GoatCounter 的 API 文档列出了 `handlers.apiHitsRequest`、`handlers.apiStatsRequest` 等模型，暗示存在 `/api/v0/hits` 端点。但实际上这些端点在公开 API 中**不可用**，调用会返回 HTML 404 页面。

经过测试，公开可用的 API 端点只有：

| 端点 | 方法 | 用途 |
|------|------|------|
| `/api/v0/me` | GET | 用户信息 |
| `/api/v0/count` | POST | 记录页面浏览 |
| `/api/v0/export` | POST | 创建数据导出 |
| `/api/v0/export/{id}` | GET | 查询导出状态 |
| `/api/v0/export/{id}/download` | GET | 下载导出文件 |
| `/counter/{path}.json` | GET | 获取页面浏览次数 |

所以浏览次数显示使用 `/counter/{path}.json`，JSON 备份也使用同一个端点。

### 2. Export API 返回 unknown format

第一次调用 Export API 时发送了空 body `{}`，返回 `{"error":"unknown format: \"\""}` 。GoatCounter 要求 body 中明确指定 `"format": "csv"`：

```bash
# 错误
curl -X POST .../api/v0/export -d '{}'

# 正确
curl -X POST .../api/v0/export -d '{"format":"csv"}'
```

### 3. Export API 响应中没有 state 字段

导出状态的判断不能用 `state` 字段（API 响应中不存在），应该检查 `finished_at` 是否非空：

```json
{
  "id": 10469,
  "finished_at": "2026-05-11T02:47:16.742518Z",
  "num_rows": 0,
  "error": null
}
```

`finished_at` 有值表示导出完成，`error` 非 null 表示失败。

### 4. YAML 中嵌入多行 Python 代码导致解析错误

最初把所有 Python 逻辑写在 GitHub Actions 工作流的 `run: |` 块中，多行 Python 代码的缩进被 YAML 解析器误认为 YAML 结构，导致大量 "Invalid block mapping key indent" 错误。

解决方案：将 Python 逻辑提取为独立的 `scripts/gc-backup.py` 文件，工作流中只需 `run: python3 scripts/gc-backup.py`。

### 5. CSV 导出为空

即使 API 调用成功，如果未在 GoatCounter 设置中启用 **"Collect individual pageviews"**，导出的 CSV 也是空的（`num_rows: 0`）。这是因为默认只保存聚合统计，不保存每次访问的原始记录。

### 6. datetime.utcnow() 弃用警告

Python 3.12 中 `datetime.utcnow()` 已弃用，应使用 `datetime.now(timezone.utc)`：

```python
# 弃用
datetime.utcnow().strftime("%Y-%m-%d")

# 正确
datetime.now(timezone.utc).strftime("%Y-%m-%d")
```

---

## 文件清单

本次新增/修改的文件：

```
blog/
├── .github/
│   └── workflows/
│       └── goatcounter-backup.yml    # 自动备份工作流
├── i18n/
│   └── zh.yaml                       # "次浏览" 翻译
├── layouts/
│   └── partials/
│       ├── extend_footer.html         # 浏览次数获取 JS
│       └── post_meta.html             # 文章 meta + 浏览次数占位
├── scripts/
│   └── gc-backup.py                   # 备份脚本
└── data/
    └── goatcounter-backup/            # 备份数据目录（自动生成）
        ├── 2026-05-11.json
        └── 2026-05-11-raw.csv
```

---

## 总结

浏览次数展示利用 GoatCounter 的 counter JSON 端点，通过 Hugo 模板覆盖 + JavaScript 动态获取，零构建开销。数据备份通过 GitHub Actions 每周自动执行，Python 脚本同时输出 JSON 统计和 CSV 明细，整个方案零成本、零依赖、零维护。

两个功能完全独立，可以只实现其中一个。对于刚起步的个人博客，浏览次数展示是最有价值的功能——至少能知道有人在看。
