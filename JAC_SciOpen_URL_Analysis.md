# JAC (Journal of Advanced Ceramics) SciOpen 网站结构与爬虫开发指南

> 本文档提供完整的 URL 结构分析、HTML DOM 结构、可抓取数据字段清单、CSS 选择器、以及可直接使用的 Python 爬虫代码模板。

---

## 1. 基本信息

| 字段 | 值 |
|------|-----|
| 期刊全称 | Journal of Advanced Ceramics |
| ISSN | 2226-4108 |
| e-ISSN | 2227-8508 |
| CN | 10-1154/TQ |
| journalId | `1396776045425197058` |
| 域名 | `www.sciopen.com` |
| 出版方 | Tsinghua University Press |
| 开放获取 | Yes (CC BY 4.0) |
| RSS Feed | `https://www.sciopen.com/journal/rss/2226-4108` |
| Sitemap | `https://www.sciopen.com/sitemap.xml` |
| 投稿系统 | `https://mc03.manuscriptcentral.com/jacer` (ScholarOne) |

---

## 2. 完整 URL 模式手册

### 2.1 期刊主页
```
https://www.sciopen.com/journal/2226-4108
```
可获取：期刊简介、编辑委员会、Impact Factor、CiteScore、最新一期 Featured 文章。

### 2.2 所有期次 (All Issues Archive)
```
https://www.sciopen.com/journal/join_journal/archive?journalId={journalId}&issn={ISSN}
```
按年份筛选：
```
https://www.sciopen.com/journal/join_journal/archive?journalId=1396776045425197058&volume={year}&issn=2226-4108
```
示例年份：2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026

### 2.3 特定期次页面 (stage_page)
```
https://www.sciopen.com/journal/join_journal/stage_page?stage={stage}&id={journalId}&issn={ISSN}
```
指定某一期：
```
https://www.sciopen.com/journal/join_journal/stage_page?stage=5&id=1396776045425197058&issueIndex={issueIndex}&issn=2226-4108
```

**stage 参数：**

| stage | 含义 | 说明 |
|-------|------|------|
| `2` | Just Accepted | 已接收，待排版 |
| `4` | Online First | 在线优先出版 |
| `5` | Latest Issue / 已出版期次 | 正式出版的文章列表 |

### 2.4 单篇文章页面
```
https://www.sciopen.com/article/{DOI}
```
DOI 格式：`10.26599/JAC.{year}.{articleNumber}`
- year: 4位年份
- articleNumber: 7位数字编号

### 2.5 其他页面
| 用途 | URL |
|------|-----|
| 关于期刊 | `/journal/join_journal/about_journal?id=1396776045425197058&issn=2226-4108` |
| 编委会 | `/journal/join_journal/editorial_board?id=1396776045425197058&issn=2226-4108` |
| 投稿指南 | `/journal/join_journal/submission_guidelines?id=1396776045425197058&issn=2226-4108` |
| 索引收录 | `/journal/join_journal/abstracted_indexed?id=1396776045425197058&issn=2226-4108` |
| 专题合集 | `/journal/topical/list?id=1396776045425197058&issn=2226-4108` |
| 视频库 | `/journal/promotion_video?id=1396776045425197058&issn=2226-4108&type=0` |
| RSS Feed | `https://www.sciopen.com/journal/rss/2226-4108` |

---

## 3. 关键参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `ISSN` | 字符串 | `2226-4108`，期刊唯一标识 |
| `journalId` | 数字字符串 | `1396776045425197058`，平台内部ID |
| `volume` | 数字 | 年份 (如 2026) |
| `issueIndex` | 数字字符串 | 每期唯一标识 |
| `stage` | 数字 | 文章状态: 2=Just Accepted, 4=Online First, 5=已出版 |
| `DOI` | 字符串 | 格式: `10.26599/JAC.{year}.{articleNumber}` |

### 已知 issueIndex (可从 archive 页面动态获取)

| Volume & Issue | issueIndex |
|---|---|
| Vol.15 Issue 6 (Jun 2026) | `2063908384445870082` |
| Vol.15 Issue 5 (May 2026) | `2054368330358775810` |
| Vol.15 Issue 4 (Apr 2026) | `2046037182297767937` |
| Vol.15 Issue 3 (Mar 2026) | `2038498588129558529` |
| Vol.15 Issue 2 (Feb 2026) | `2018969058264313857` |
| Vol.15 Issue 1 (Jan 2026) | `2014246914326265858` |

---

## 4. HTML 结构分析 (DOM 选择器)

### 4.1 文章详情页 (`/article/{DOI}`) — 可抓取数据

#### Meta 标签 (最可靠的提取方式)

文章页面在 `<head>` 中包含大量结构化 `<meta>` 标签，**不需要解析 DOM，直接用 regex 或 BeautifulSoup 解析 meta 标签即可**：

```html
<!-- DOI -->
<meta name="citation_doi" content="10.26599/JAC.2026.9221301" />

<!-- 文章标题 -->
<meta name="citation_title" content="High-entropy ceramics: From paradigm formation to ordered development" />

<!-- 作者 (每个作者一个 meta 标签，可重复) -->
<meta name="citation_author" content="Lei Su" />
<meta name="citation_author" content="Hongjie Wang" />
<meta name="citation_author" content="Yanchun Zhou" />

<!-- 作者机构 (每个作者一个 meta 标签，可重复) -->
<meta name="citation_author_institution" content="State Key Laboratory for Mechanical Behavior of Materials,CHINA. Xi'an Jiaotong University, 710049,CHINA. Shaanxi Laboratory of Advanced Materials,CHINA. Xi'an Jiaotong University, 710049,CHINA. " />

<!-- 卷号 -->
<meta name="citation_volume" content="15" />

<!-- 期号 -->
<meta name="citation_issue" content="6" />

<!-- 出版日期 -->
<meta name="citation_publication_date" content="2026/6/1" />

<!-- 在线日期 -->
<meta name="citation_online_date" content="2026/6/23" />

<!-- 首页/文章编号 -->
<meta name="citation_firstpage" content="9221301" />

<!-- ISSN -->
<meta name="citation_issn" content="2226-4108" />

<!-- PDF 直链 (固定格式) -->
<meta name="citation_pdf_url" content="https://www.sciopen.com/local/article_pdf/10.26599/JAC.2026.9221301.pdf" />

<!-- 文章页面 URL -->
<meta name="citation_abstract_html_url" content="https://www.sciopen.com/article/10.26599/JAC.2026.9221301" />
<meta name="citation_fulltext_html_url" content="https://www.sciopen.com/article/10.26599/JAC.2026.9221301" />

<!-- 关键词 (每个关键词一个 meta 标签) -->
<meta content="high-entropy ceramics (HECs)" name="citation_keywords" />
<meta content="enthalpy" name="citation_keywords" />
<meta content="paradigm formation" name="citation_keywords" />
<meta content="rational design" name="citation_keywords" />
<meta content="ordered development" name="citation_keywords" />

<!-- 出版方 -->
<meta name="citation_publisher" content="清华大学出版社" />

<!-- 语言 -->
<meta name="citation_language" content="en" />
```

#### JSON-LD 结构化数据

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ScholarlyArticle",
  "name": "High-entropy ceramics: From paradigm formation to ordered development",
  "authors": [
    {"name": "Lei Su", "@type": "Person"},
    {"name": "Hongjie Wang", "@type": "Person"},
    {"name": "Yanchun Zhou", "@type": "Person"}
  ],
  "datePublished": "2026/6/23",
  "journalName": "Journal of Advanced Ceramics",
  "volumeNumber": "15",
  "issueNumber": "6",
  "pagination": "9221301",
  "publisher": {"name": "清华大学出版社", "@type": "Organization"},
  "identifier": {
    "propertyID": "DOI",
    "@type": "PropertyValue",
    "value": "10.26599/JAC.2026.9221301"
  },
  "url": "https://www.sciopen.com/article/10.26599/JAC.2026.9221301",
  "description": "<p>Abstract HTML content...</p>",
  "isPartOf": {
    "@id": "https://www.sciopen.com/journal/2226-4108",
    "issn": "2226-4108",
    "@type": "Periodical"
  },
  "hasPart": {
    "contentUrl": "https://www.sciopen.com/local/article_pdf/10.26599/JAC.2026.9221301.pdf",
    "encodingFormat": "application/pdf",
    "@type": "DigitalDocument"
  }
}
</script>
```

#### OG 标签 (社交媒体分享)
```html
<meta property="og:title" content="..." />
<meta property="og:type" content="Article" />
<meta property="og:url" content="https://www.sciopen.com/article/10.26599/JAC.2026.9221301" />
<meta property="og:site_name" content="SciOpen" />
<meta property="og:description" content="<p>Abstract HTML...</p>" />
```

#### 摘要 (Abstract)

摘要内容在 HTML `<body>` 中，位于文章标题下方的 `.abstract` 区域。但更方便的做法是从 `og:description` meta 标签中提取（已 HTML-escaped），或者从 JSON-LD 的 `description` 字段提取。

#### 引用格式
```html
<meta name="article_references" content="Su L, Wang H, Zhou Y. High-entropy ceramics... https://doi.org/10.26599/JAC.2026.9221301" />
```

#### 引用/下载链接
- RIS 导出: `/article/download_ris?tag=2&id={internal_article_id}`
- BibTeX 导出: `/article/download_ris?tag=3&id={internal_article_id}`
- PDF 下载: `https://www.sciopen.com/local/article_pdf/{DOI}.pdf`
- Google Scholar: `http://scholar.google.com/scholar?hl=en&lr=&cites=http://dx.doi.org/{DOI}`

> **注意**: `internal_article_id` 是平台内部数字 ID (如 `2046421777321132034`)，与 DOI 不同，需要从页面 HTML 中提取。

### 4.2 期次页面 (`stage_page?stage=5`) — 文章列表

每篇文章在列表中的 HTML 结构（简化）：

```html
<div class="article-item">
  <a href="/article/10.26599/JAC.2026.9221301">
    <!-- 文章标题 -->
    <h3 class="article-title">High-entropy ceramics: From paradigm formation to ordered development</h3>
  </a>
  
  <!-- 作者列表 (有截断) -->
  <p class="article-authors">
    Lei Su, Hongjie Wang, Yanchun Zhou
  </p>
  
  <!-- 文章类型 + 发布日期 -->
  <span>Research Article | Open Access</span>
  <span>Published: 23 June 2026</span>
  
  <!-- 卷期号 + 文章编号 -->
  <span>2026, 15(6): 9221301</span>
  
  <!-- 摘要缩略图 (OSS 签名 URL) -->
  <img src="https://wqketang.oss-cn-beijing.aliyuncs.com/zip-unzip/..." />
</div>
```

**CSS 选择器 (基于实际 HTML 结构)**:
- 文章链接: `a[href^="/article/10.26599/"]`
- 文章标题: `.article-title` 或 `a[href^="/article/"] h3`
- 作者列表: `.article-authors`
- 发布日期: 包含 "Published:" 的文本节点
- 文章类型: 包含 "Research Article" / "Review" / "Retraction Notice" 的文本

### 4.3 Archive 页面 — 期次列表

每期在列表中的结构：

```html
<div class="issue-item">
  <a href="/journal/join_journal/stage_page?stage=5&id=1396776045425197058&issueIndex=2063908384445870082&issn=2226-4108">
    <!-- 封面图 -->
    <img src="https://wqketang.oss-cn-beijing.aliyuncs.com/..." />
    <!-- 卷期号 -->
    <span>Volume 15, Issue 6</span>
    <!-- 月份 -->
    <span>June</span>
    <!-- 文章数量 -->
    <span>19 articles</span>
  </a>
</div>
```

**CSS 选择器**:
- 期次链接: `a[href*="stage_page?stage=5"]`
- 封面图: `img[src*="wqketang.oss"]`
- issueIndex 提取: 从 URL 参数 `issueIndex` 中解析

---

## 5. 完整可抓取数据字段清单

### 5.1 文章级数据 (从 `/article/{DOI}` 页面)

| # | 字段 | 提取方式 | 说明 |
|---|------|----------|------|
| 1 | DOI | `meta[name="citation_doi"]` | `10.26599/JAC.2026.9221301` |
| 2 | 标题 | `meta[name="citation_title"]` | 文章英文标题 |
| 3 | 作者列表 | `meta[name="citation_author"]` (多个) | 每个作者一个标签 |
| 4 | 作者机构 | `meta[name="citation_author_institution"]` (多个) | 每个作者一个标签 |
| 5 | 关键词 | `meta[name="citation_keywords"]` / `meta[content][name="citation_keywords"]` (多个) | 每个关键词一个标签 |
| 6 | 摘要 | `og:description` 或 JSON-LD `description` | HTML 格式，需 unescape |
| 7 | 卷号 | `meta[name="citation_volume"]` | 如 `15` |
| 8 | 期号 | `meta[name="citation_issue"]` | 如 `6` |
| 9 | 文章编号 | `meta[name="citation_firstpage"]` | 如 `9221301` |
| 10 | 出版日期 | `meta[name="citation_publication_date"]` | `2026/6/1` |
| 11 | 在线日期 | `meta[name="citation_online_date"]` | `2026/6/23` |
| 12 | 语言 | `meta[name="citation_language"]` | `en` |
| 13 | ISSN | `meta[name="citation_issn"]` | `2226-4108` |
| 14 | 出版方 | `meta[name="citation_publisher"]` | `清华大学出版社` |
| 15 | PDF URL | `meta[name="citation_pdf_url"]` | 固定格式直链 |
| 16 | 引用格式 | `meta[name="article_references"]` | 完整引用文本 |
| 17 | RIS 下载 | `/article/download_ris?tag=2&id={internal_id}` | 需提取 internal_id |
| 18 | BibTeX 下载 | `/article/download_ris?tag=3&id={internal_id}` | 需提取 internal_id |
| 19 | 文章类型 | HTML body 文本匹配 | Review / Research Article / Retraction Notice 等 |
| 20 | Open Access | HTML body 文本匹配 | 包含 "Open Access" |
| 21 | 许可协议 | HTML body 文本匹配 | CC BY 4.0 |
| 22 | 收稿日期 | HTML body (Received:) | 页面中有 "Received: 28 February 2026" |
| 23 | 修改日期 | HTML body (Revised:) | 页面中有 "Revised: 16 April 2026" |
| 24 | 接收日期 | HTML body (Accepted:) | 页面中有 "Accepted: 16 April 2026" |
| 25 | 在线发布日 | HTML body (Published:) | 页面中有 "Published: 23 June 2026" |
| 26 | 浏览量 | HTML body (Views) | 如 `1418` |
| 27 | 下载量 | HTML body (Downloads) | 如 `476` |
| 28 | Crossref 引用 | HTML body (Crossref) | 如 `0` |
| 29 | WoS 引用 | HTML body (Web of Science) | 如 `0` |
| 30 | Scopus 引用 | HTML body (Scopus) | 如 `0` |
| 31 | CSCD 引用 | HTML body (CSCD) | 如 `0` |
| 32 | 参考文献列表 | HTML body (References 区域) | 含 Crossref/Google Scholar 链接 |
| 33 | 封面图 URL | JSON-LD 或 HTML img | OSS 签名 URL |
| 34 | 内部文章ID | HTML (download/collection 按钮) | 用于 RIS/BibTeX 下载 |

### 5.2 期次级数据 (从 `stage_page` 页面)

| # | 字段 | 提取方式 | 说明 |
|---|------|----------|------|
| 1 | 卷号 | 页面标题 / URL | 如 `15` |
| 2 | 期号 | 页面标题 / URL | 如 `6` |
| 3 | 出版月份 | 页面标题 / URL | 如 `June` |
| 4 | 年份 | URL 参数 | `2026` |
| 5 | issueIndex | URL 参数 | `2063908384445870082` |
| 6 | 文章数量 | 页面文本 | `19 articles` |
| 7 | 封面图 URL | `<img>` 标签 | OSS 签名 URL |
| 8 | 封底图 URL | `<img>` 标签 | OSS 签名 URL |
| 9 | 目录 PDF | 页面链接 | `Contents(PDF)` |
| 10 | 文章列表 | 重复的 article-item 块 | 每篇文章的标题/作者/DOI/类型/日期 |
| 11 | 前期链接 | `Previous Issue` 链接 | 含 issueIndex |
| 12 | 后期链接 | `Next Issue` 链接 | 含 issueIndex |

### 5.3 期次列表数据 (从 `archive` 页面)

| # | 字段 | 提取方式 | 说明 |
|---|------|----------|------|
| 1 | 年份列表 | 页面标签 | 2012-2026 |
| 2 | 卷号 | 期次卡片 | 如 `Volume 15` |
| 3 | 期号 | 期次卡片 | 如 `Issue 6` |
| 4 | 月份 | 期次卡片 | 如 `June` |
| 5 | 文章数量 | 期次卡片 | 如 `19 articles` |
| 6 | issueIndex | URL 参数 | 从链接中解析 |
| 7 | 封面图 URL | `<img>` 标签 | OSS 签名 URL |
| 8 | 期次链接 | `<a href>` | 完整 stage_page URL |

---

## 6. 推荐爬取策略

### 6.1 总体流程

```
Step 1: 获取所有年份
  GET /journal/join_journal/archive?journalId=1396776045425197058&issn=2226-4108
  → 提取所有年份标签 (2012-2026)

Step 2: 获取每年的期次列表
  GET /journal/join_journal/archive?journalId=1396776045425197058&volume={year}&issn=2226-4108
  → 提取每个期次的 issueIndex

Step 3: 获取每期的文章列表
  GET /journal/join_journal/stage_page?stage=5&id=1396776045425197058&issueIndex={issueIndex}&issn=2226-4108
  → 提取每篇文章的 DOI

Step 4: 获取单篇文章详情
  GET /article/{DOI}
  → 提取所有 meta 标签数据 + JSON-LD + 正文数据
```

### 6.2 也可以抓取非正式出版的内容

```
Just Accepted (stage=2):
  GET /journal/join_journal/stage_page?stage=2&id=1396776045425197058&issn=2226-4108

Online First (stage=4):
  GET /journal/join_journal/stage_page?stage=4&id=1396776045425197058&issn=2226-4108
```

---

## 7. 技术要点

### 7.1 渲染方式
- **Vue.js + 服务端渲染** (SSR)
- 页面 HTML 中包含 Vue 模板语法 `{{item.xxx}}`，但文章内容数据**已经在初始 HTML 中**
- `<meta>` 标签和 JSON-LD 数据是服务端渲染的，**不需要 JavaScript 执行**
- 部分 UI 交互（菜单、搜索）使用客户端 Vue 渲染

### 7.2 推荐爬虫技术栈
- **Python**: `requests` + `BeautifulSoup4` (足够)
- 不需要 Selenium/Playwright (文章数据在初始 HTML 中)
- 如需抓取搜索结果等 JS 动态内容，可使用 Playwright

### 7.3 反爬注意事项
- 图片资源来自阿里云 OSS (`wqketang.oss-cn-beijing.aliyuncs.com`)
- OSS URL 带签名参数 (`Expires`, `OSSAccessKeyId`, `Signature`, `security-token`)，**有时效性**
- 建议每次请求时从 HTML 中重新提取图片 URL
- PDF 下载 URL 是固定格式: `https://www.sciopen.com/local/article_pdf/{DOI}.pdf` (不带签名)
- 建议请求间隔 1-2 秒，避免触发频率限制

### 7.4 Robots.txt
- 需要检查 `https://www.sciopen.com/robots.txt` 了解爬取限制

---

## 8. Python 爬虫代码模板

### 8.1 获取所有期次的 issueIndex

```python
import requests
from bs4 import BeautifulSoup
import re

BASE_URL = "https://www.sciopen.com"
JOURNAL_ID = "1396776045425197058"
ISSN = "2226-4108"

def get_all_issues():
    """获取所有年份的所有期次 issueIndex"""
    all_issues = []
    
    for year in range(2012, 2027):  # 2012-2026
        url = f"{BASE_URL}/journal/join_journal/archive?journalId={JOURNAL_ID}&volume={year}&issn={ISSN}"
        resp = requests.get(url)
        soup = BeautifulSoup(resp.text, "html.parser")
        
        # 提取所有包含 issueIndex 的链接
        for a in soup.find_all("a", href=re.compile(r"issueIndex=")):
            href = a["href"]
            match = re.search(r"issueIndex=(\d+)", href)
            if match:
                issue_index = match.group(1)
                # 从同一链接或附近元素提取卷期信息
                all_issues.append({
                    "year": year,
                    "issueIndex": issue_index,
                    "url": BASE_URL + href if href.startswith("/") else href
                })
    
    return all_issues
```

### 8.2 获取某期的文章列表

```python
def get_articles_in_issue(issue_index):
    """获取某期所有文章的 DOI"""
    url = f"{BASE_URL}/journal/join_journal/stage_page?stage=5&id={JOURNAL_ID}&issueIndex={issue_index}&issn={ISSN}"
    resp = requests.get(url)
    soup = BeautifulSoup(resp.text, "html.parser")
    
    articles = []
    # 提取所有文章链接 (DOI 格式)
    for a in soup.find_all("a", href=re.compile(r"/article/10\.26599/JAC\.")):
        href = a["href"]
        doi_match = re.search(r"/article/(10\.26599/JAC\.\d+\.\d+)", href)
        if doi_match:
            doi = doi_match.group(1)
            title = a.get_text(strip=True)
            if title and doi not in [art["doi"] for art in articles]:
                articles.append({"doi": doi, "title": title})
    
    return articles
```

### 8.3 获取文章详情 (使用 meta 标签提取)

```python
def get_article_details(doi):
    """从文章页面提取所有 meta 标签数据"""
    url = f"{BASE_URL}/article/{doi}"
    resp = requests.get(url)
    soup = BeautifulSoup(resp.text, "html.parser")
    
    def get_meta(name):
        """提取单个 meta 标签内容"""
        tag = soup.find("meta", attrs={"name": name})
        return tag["content"] if tag else None
    
    def get_meta_all(name):
        """提取所有同名 meta 标签内容"""
        return [tag["content"] for tag in soup.find_all("meta", attrs={"name": name}) if tag.get("content")]
    
    # JSON-LD 提取
    json_ld = None
    for script in soup.find_all("script", type="application/ld+json"):
        import json
        json_ld = json.loads(script.string)
    
    # 提取 internal article ID (用于 RIS/BibTeX 下载)
    internal_id = None
    ris_link = soup.find("a", href=re.compile(r"download_ris\?tag=2"))
    if ris_link:
        id_match = re.search(r"id=(\d+)", ris_link["href"])
        if id_match:
            internal_id = id_match.group(1)
    
    # 提取 Open Access / 文章类型
    page_text = soup.get_text()
    article_type = None
    for atype in ["Review", "Research Article", "Retraction Notice", "Short Communication", "Letter"]:
        if atype in page_text:
            article_type = atype
            break
    
    return {
        # 基本信息
        "doi": get_meta("citation_doi"),
        "title": get_meta("citation_title"),
        "authors": get_meta_all("citation_author"),
        "affiliations": get_meta_all("citation_author_institution"),
        "keywords": get_meta_all("citation_keywords"),
        "language": get_meta("citation_language"),
        
        # 出版信息
        "volume": get_meta("citation_volume"),
        "issue": get_meta("citation_issue"),
        "first_page": get_meta("citation_firstpage"),
        "publication_date": get_meta("citation_publication_date"),
        "online_date": get_meta("citation_online_date"),
        "publisher": get_meta("citation_publisher"),
        "issn": get_meta("citation_issn"),
        
        # 文件
        "pdf_url": get_meta("citation_pdf_url"),
        "article_url": get_meta("citation_abstract_html_url"),
        
        # 引用
        "citation_text": get_meta("article_references"),
        "ris_url": f"{BASE_URL}/article/download_ris?tag=2&id={internal_id}" if internal_id else None,
        "bibtex_url": f"{BASE_URL}/article/download_ris?tag=3&id={internal_id}" if internal_id else None,
        "google_scholar_url": f"http://scholar.google.com/scholar?hl=en&lr=&cites=http://dx.doi.org/{doi}",
        
        # 扩展
        "internal_id": internal_id,
        "article_type": article_type,
        "json_ld": json_ld,
    }
```

### 8.4 完整爬取脚本

```python
import time
import json
import csv

def scrape_all():
    """完整爬取流程"""
    results = []
    
    # Step 1: 获取所有期次
    print("Getting all issues...")
    issues = get_all_issues()
    print(f"Found {len(issues)} issues")
    
    # Step 2: 获取每期文章
    all_dois = []
    for issue in issues:
        print(f"Getting articles for {issue['year']} issueIndex={issue['issueIndex']}...")
        articles = get_articles_in_issue(issue["issueIndex"])
        for art in articles:
            art["year"] = issue["year"]
            art["issueIndex"] = issue["issueIndex"]
        all_dois.extend(articles)
        time.sleep(1)  # 避免频繁请求
    
    print(f"Found {len(all_dois)} articles total")
    
    # Step 3: 获取每篇文章详情
    for i, art in enumerate(all_dois):
        print(f"[{i+1}/{len(all_dois)}] Getting details for {art['doi']}...")
        try:
            details = get_article_details(art["doi"])
            details["issue_year"] = art["year"]
            details["issueIndex"] = art["issueIndex"]
            results.append(details)
        except Exception as e:
            print(f"  Error: {e}")
        time.sleep(1)
    
    return results


def save_to_csv(results, filename="jac_articles.csv"):
    """保存为 CSV"""
    if not results:
        return
    
    fieldnames = list(results[0].keys())
    # 移除复杂字段
    fieldnames = [f for f in fieldnames if f not in ("json_ld", "authors", "affiliations", "keywords")]
    
    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in results:
            writer.writerow({k: row.get(k, "") for k in fieldnames})


def save_to_json(results, filename="jac_articles.json"):
    """保存为 JSON"""
    # 清理不可序列化的字段
    clean = []
    for r in results:
        row = {k: v for k, v in r.items() if k != "json_ld"}
        clean.append(row)
    
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(clean, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    results = scrape_all()
    save_to_csv(results)
    save_to_json(results)
    print(f"Done! Saved {len(results)} articles.")
```

---

## 9. 已知文章类型

| 类型 | 英文 | 说明 |
|------|------|------|
| 综述 | Review | 系统性综述文章 |
| 研究论文 | Research Article | 原创研究 |
| 撤稿声明 | Retraction Notice | 撤回已发表文章 |
| 短通讯 | Short Communication | 简短研究通讯 |
| 致编辑信 | Letter | 致编辑的信件 |

---

## 10. 示例数据 (Vol.15 Issue 6, June 2026)

| 文章标题 | DOI | 类型 |
|---------|-----|------|
| High-entropy ceramics: From paradigm formation to ordered development | 10.26599/JAC.2026.9221301 | Review |
| First-principles insights into solid solution mechanisms of doped Gd2Zr2O7... | 10.26599/JAC.2026.9221295 | Research Article |
| Enhancing densification and mechanical performance of B4C ceramics... | 10.26599/JAC.2026.9221297 | Research Article |
| Chemical composition regulation to enhance the energy storage property... | 10.26599/JAC.2026.9221298 | Research Article |
| Multicomponent hexaborides with high infrared emissivity... | 10.26599/JAC.2026.9221299 | Research Article |
| Dense core–shell eutectic Zr–Ta–O as a sacrificial layer... | 10.26599/JAC.2026.9221300 | Research Article |
| Ultra-high piezoelectric properties of BiFeO3–BaTiO3... | 10.26599/JAC.2026.9221302 | Research Article |
| Intergrown columnar clusters toughening silicon nitride ceramics | 10.26599/JAC.2026.9221303 | Research Article |
| Retraction notice to: Fabrication of dense SiBCN monolith... | 10.26599/JAC.2026.9221304 | Retraction Notice |
| Enhancing microwave dielectric properties of Li2TiO3 ceramics... | 10.26599/JAC.2026.9221305 | Research Article |
| Creating nanosized engineered domains in 2D clamped BaTiO3... | 10.26599/JAC.2026.9221306 | Research Article |
| Secondary cold isostatic pressing-assisted pressureless sintering... | 10.26599/JAC.2026.9221307 | Research Article |
| Nanoparticle-induced phase transformation boosts mechanical... | 10.26599/JAC.2026.9221308 | Research Article |
| Li+ and Nb5+ codoped BNT-based ceramic with ultrahigh electrostrain... | 10.26599/JAC.2026.9221309 | Research Article |
| High toughness and strong microwave absorption of layered Si3N4–SiC/BN... | 10.26599/JAC.2026.9221310 | Research Article |
| Multiscale particle grading of monodisperse spherical Al2O3 ceramics... | 10.26599/JAC.2026.9221311 | Research Article |
| Defect regulation and photodarkening suppression in Yb:Y2O3... | 10.26599/JAC.2026.9221312 | Research Article |
| Achieving superior thermal stability in vat photopolymerized silica... | 10.26599/JAC.2026.9221313 | Research Article |
| Mechanism of improved breakdown strength and energy storage... | 10.26599/JAC.2026.9221314 | Research Article |

*共 19 篇文章 (含 1 篇 Retraction Notice)*

---

## 十二、各年份文章量统计 (2012-2026)

| 年份 | 期数 | 每期文章数 | 年文章总量 | Volume | 备注 |
|------|------|-----------|-----------|--------|------|
| 2012 | 4 | 8-10 | **34** | 1 | 创刊年 |
| 2013 | 4 | 10 | **40** | 2 | |
| 2014 | 4 | 8-11 | **41** | 3 | |
| 2015 | 4 | 10 | **40** | 4 | |
| 2016 | 4 | 10-11 | **41** | 5 | |
| 2017 | 4 | 10 | **40** | 6 | |
| 2018 | 4 | 12-13 | **52** | 7 | 开始扩容 |
| 2019 | 6 | 12-13 | **73** | 8 | 改为双月刊 |
| 2020 | 6 | 12 | **72** | 9 | |
| 2021 | 12 | 12-13 | **145** | 10 | 改为月刊 |
| 2022 | 12 | 12-16 | **162** | 11 | |
| 2023 | 12 | 12-16 | **171** | 12 | |
| 2024 | 12 | 14-19 | **204** | 13 | |
| 2025 | 12 | 16-19 | **204** | 14 | |
| 2026 | 6 | 18-19 | **110** | 15 | 截至6月 |
| **合计** | | | **~1429** | | |

> 注: 2026年仅统计到第6期，全年预计 ~200篇。总计约 **1500+ 篇文章**。

---

## 十三、C 语言爬虫存储方案

### 13.1 技术栈

| 功能 | 库 | 用途 |
|------|-----|------|
| HTTP 请求 | **libcurl** | 请求所有页面 |
| HTML 解析 | **libxml2** (XPath) | 提取 meta 标签和 DOM 内容 |
| JSON 生成 | **cJSON** | 输出结构化数据 |
| SQLite 存储 | **sqlite3** | 持久化存储文章数据 |
| 字符串 | 标准库 | 拼接 URL、清洗数据 |

编译命令:
```bash
gcc -o jac_scraper jac_scraper.c -lcurl -lxml2 -lsqlite3 -lcjson -I/usr/include/libxml2
```

### 13.2 数据库设计 (SQLite)

```sql
-- 期次表
CREATE TABLE issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    volume INTEGER NOT NULL,
    issue INTEGER NOT NULL,
    month TEXT,
    issue_index TEXT UNIQUE,
    article_count INTEGER,
    cover_url TEXT,
    page_url TEXT
);

-- 文章表
CREATE TABLE articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doi TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    article_type TEXT,
    volume INTEGER,
    issue_num INTEGER,
    firstpage TEXT,
    
    -- 日期
    publication_date TEXT,
    online_date TEXT,
    received_date TEXT,
    revised_date TEXT,
    accepted_date TEXT,
    
    -- 内容
    abstract TEXT,
    keywords TEXT,           -- JSON 数组: ["key1","key2"]
    language TEXT,
    
    -- 下载
    pdf_url TEXT,
    internal_id TEXT,
    ris_url TEXT,
    bibtex_url TEXT,
    page_url TEXT,
    
    -- 统计
    views INTEGER DEFAULT 0,
    downloads INTEGER DEFAULT 0,
    crossref_cite INTEGER DEFAULT 0,
    wos_cite INTEGER DEFAULT 0,
    scopus_cite INTEGER DEFAULT 0,
    csdc_cite INTEGER DEFAULT 0,
    
    -- 元数据
    citation_text TEXT,
    json_ld TEXT,            -- 完整 JSON-LD
    og_title TEXT,
    og_description TEXT,
    
    -- 管理
    issue_index TEXT,
    scraped_at TEXT,
    
    FOREIGN KEY (issue_index) REFERENCES issues(issue_index)
);

-- 作者表 (多对多)
CREATE TABLE authors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_doi TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_order INTEGER,
    FOREIGN KEY (article_doi) REFERENCES articles(doi)
);

-- 机构表 (多对多)
CREATE TABLE institutions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_doi TEXT NOT NULL,
    institution_text TEXT NOT NULL,
    FOREIGN KEY (article_doi) REFERENCES articles(doi)
);

-- 索引
CREATE INDEX idx_articles_doi ON articles(doi);
CREATE INDEX idx_articles_year ON articles(volume);
CREATE INDEX idx_articles_type ON articles(article_type);
CREATE INDEX idx_authors_doi ON authors(article_doi);
CREATE INDEX idx_institutions_doi ON institutions(article_doi);
```

### 13.3 存储空间估算

```
单篇文章数据量估算:
  标题:        ~200 bytes
  DOI:         ~40 bytes
  作者列表:    ~300 bytes (3-5个作者)
  机构列表:    ~500 bytes
  摘要:        ~2000 bytes
  关键词:      ~200 bytes
  其他字段:    ~1000 bytes
  ─────────────────────
  单篇总计:    ~4.2 KB

1500 篇文章:
  数据库大小:  ~6.3 MB (纯数据)
  加索引:      ~8 MB
  加 JSON 元数据: ~12 MB

结论: 1500 篇文章的 SQLite 数据库约 10-15 MB，完全可管理。
```

### 13.4 C 语言核心结构体

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <curl/curl.h>
#include <libxml/HTMLparser.h>
#include <libxml/xpath.h>
#include <sqlite3.h>
#include <cjson/cJSON.h>

#define MAX_FIELD 4096
#define MAX_AUTHORS 20
#define MAX_KEYWORDS 20

typedef struct {
    char doi[MAX_FIELD];
    char title[MAX_FIELD];
    char article_type[64];
    int volume;
    int issue_num;
    char firstpage[32];
    char publication_date[32];
    char online_date[32];
    char received_date[32];
    char revised_date[32];
    char accepted_date[32];
    char abstract[8192];
    char keywords[MAX_KEYWORDS][256];
    int keyword_count;
    char authors[MAX_AUTHORS][256];
    int author_count;
    char institutions[MAX_AUTHORS][512];
    int institution_count;
    char language[16];
    char pdf_url[MAX_FIELD];
    char internal_id[32];
    char ris_url[MAX_FIELD];
    char bibtex_url[MAX_FIELD];
    char page_url[MAX_FIELD];
    char citation_text[MAX_FIELD];
    char json_ld[16384];
    int views;
    int downloads;
    char issue_index[32];
} JACArticle;

typedef struct {
    int year;
    int volume;
    int issue;
    char month[16];
    char issue_index[32];
    int article_count;
    char cover_url[MAX_FIELD];
} JACIssue;

// HTTP 响应缓冲区
struct MemoryStruct {
    char *memory;
    size_t size;
};

static size_t WriteMemoryCallback(void *contents, size_t size, size_t nmemb, void *userp) {
    size_t realsize = size * nmemb;
    struct MemoryStruct *mem = (struct MemoryStruct *)userp;
    char *ptr = realloc(mem->memory, mem->size + realsize + 1);
    if (!ptr) return 0;
    mem->memory = ptr;
    memcpy(&(mem->memory[mem->size]), contents, realsize);
    mem->size += realsize;
    mem->memory[mem->size] = 0;
    return realsize;
}

// 获取网页内容
char *fetch_url(const char *url) {
    CURL *curl = curl_easy_init();
    struct MemoryStruct chunk = {0};
    chunk.memory = malloc(1);
    
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteMemoryCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, (void *)&chunk);
    curl_easy_setopt(curl, CURLOPT_USERAGENT, "Mozilla/5.0");
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 30L);
    curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
    curl_easy_perform(curl);
    curl_easy_cleanup(curl);
    
    return chunk.memory;
}
```

### 13.5 Meta 标签提取 (核心函数)

```c
// 从 HTML 提取 meta[name=xxx] 的 content 属性
// 支持多个同名 meta 标签 (如 citation_author, citation_keywords)
int extract_meta_values(const char *html, const char *name,
                        char values[][512], int max_values) {
    char xpath_expr[256];
    snprintf(xpath_expr, sizeof(xpath_expr),
             "//meta[@name='%s']/@content | //meta[@property='%s']/@content",
             name, name);
    
    htmlDocPtr doc = htmlReadMemory(html, strlen(html), NULL, NULL,
                                     HTML_PARSE_NOERROR | HTML_PARSE_NOWARNING);
    if (!doc) return 0;
    
    xmlXPathContextPtr ctx = xmlXPathNewContext(doc);
    xmlXPathObjectPtr result = xmlXPathEvalExpression(BAD_CAST xpath_expr, ctx);
    
    int count = 0;
    if (result && result->nodesetval) {
        xmlNodeSetPtr nodes = result->nodesetval;
        for (int i = 0; i < nodes->nodeNr && count < max_values; i++) {
            xmlChar *content = xmlNodeListGetString(doc, nodes->nodeTab[i]->children, 1);
            if (content) {
                strncpy(values[count], (char *)content, 511);
                values[count][511] = '\0';
                xmlFree(content);
                count++;
            }
        }
    }
    
    xmlXPathFreeObject(result);
    xmlXPathFreeContext(ctx);
    xmlFreeDoc(doc);
    return count;
}

// 提取单个 meta 值
int extract_meta_single(const char *html, const char *name, char *out, int out_size) {
    char values[1][512];
    int n = extract_meta_values(html, name, values, 1);
    if (n > 0) {
        strncpy(out, values[0], out_size - 1);
        return 1;
    }
    out[0] = '\0';
    return 0;
}

// 从 onclick 属性提取 internal_id
int extract_internal_id(const char *html, char *out, int out_size) {
    const char *pattern = "previewActivityPdf(&quot;";
    const char *found = strstr(html, pattern);
    if (!found) return 0;
    found += strlen(pattern);
    const char *end = strstr(found, "&quot;");
    if (!end) return 0;
    int len = end - found;
    if (len >= out_size) len = out_size - 1;
    strncpy(out, found, len);
    out[len] = '\0';
    return 1;
}
```

### 13.6 文章详情解析

```c
int parse_article_page(const char *html, JACArticle *art) {
    memset(art, 0, sizeof(JACArticle));
    
    // Meta 标签提取 (最可靠)
    extract_meta_single(html, "citation_doi", art->doi, MAX_FIELD);
    extract_meta_single(html, "citation_title", art->title, MAX_FIELD);
    extract_meta_single(html, "citation_volume", art->firstpage, 32);
    // volume 和 issue 需要 atoi 转换
    char vol_str[16], iss_str[16], fp_str[32];
    extract_meta_single(html, "citation_volume", vol_str, 16);
    extract_meta_single(html, "citation_issue", iss_str, 16);
    extract_meta_single(html, "citation_firstpage", fp_str, 32);
    art->volume = atoi(vol_str);
    art->issue_num = atoi(iss_str);
    strncpy(art->firstpage, fp_str, 31);
    
    extract_meta_single(html, "citation_publication_date", art->publication_date, 32);
    extract_meta_single(html, "citation_online_date", art->online_date, 32);
    extract_meta_single(html, "citation_language", art->language, 16);
    extract_meta_single(html, "citation_pdf_url", art->pdf_url, MAX_FIELD);
    extract_meta_single(html, "og:title", art->og_title, MAX_FIELD);
    extract_meta_single(html, "og:description", art->abstract, 8192);
    extract_meta_single(html, "article_references", art->citation_text, MAX_FIELD);
    
    // 多值字段
    art->author_count = extract_meta_values(html, "citation_author",
                                             art->authors, MAX_AUTHORS);
    art->institution_count = extract_meta_values(html, "citation_author_institution",
                                                  art->institutions, MAX_AUTHORS);
    art->keyword_count = extract_meta_values(html, "citation_keywords",
                                              art->keywords, MAX_KEYWORDS);
    
    // Internal ID
    extract_internal_id(html, art->internal_id, 32);
    if (art->internal_id[0]) {
        snprintf(art->ris_url, MAX_FIELD,
                 "https://www.sciopen.com/article/download_ris?tag=2&id=%s",
                 art->internal_id);
        snprintf(art->bibtex_url, MAX_FIELD,
                 "https://www.sciopen.com/article/download_ris?tag=3&id=%s",
                 art->internal_id);
    }
    
    // 从 DOI 构造页面 URL
    snprintf(art->page_url, MAX_FIELD,
             "https://www.sciopen.com/article/%s", art->doi);
    
    return 0;
}
```

### 13.7 SQLite 存储

```c
int save_article(sqlite3 *db, JACArticle *art) {
    sqlite3_stmt *stmt;
    const char *sql = "INSERT OR REPLACE INTO articles "
        "(doi, title, article_type, volume, issue_num, firstpage, "
        "publication_date, online_date, received_date, revised_date, accepted_date, "
        "abstract, keywords, language, pdf_url, internal_id, ris_url, bibtex_url, "
        "page_url, citation_text, views, downloads, issue_index, scraped_at) "
        "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))";
    
    // 将 keywords 数组序列化为 JSON
    char keywords_json[4096] = "[";
    cJSON *kw_arr = cJSON_CreateArray();
    for (int i = 0; i < art->keyword_count; i++) {
        cJSON_AddItemToArray(kw_arr, cJSON_CreateString(art->keywords[i]));
    }
    char *kw_str = cJSON_PrintUnformatted(kw_arr);
    strncpy(keywords_json, kw_str, 4095);
    cJSON_free(kw_str);
    cJSON_Delete(kw_arr);
    strcat(keywords_json, "]");
    
    sqlite3_prepare_v2(db, sql, -1, &stmt, NULL);
    sqlite3_bind_text(stmt, 1, art->doi, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 2, art->title, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 3, art->article_type, -1, SQLITE_STATIC);
    sqlite3_bind_int(stmt, 4, art->volume);
    sqlite3_bind_int(stmt, 5, art->issue_num);
    sqlite3_bind_text(stmt, 6, art->firstpage, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 7, art->publication_date, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 8, art->online_date, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 9, art->received_date, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 10, art->revised_date, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 11, art->accepted_date, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 12, art->abstract, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 13, keywords_json, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 14, art->language, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 15, art->pdf_url, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 16, art->internal_id, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 17, art->ris_url, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 18, art->bibtex_url, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 19, art->page_url, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 20, art->citation_text, -1, SQLITE_STATIC);
    sqlite3_bind_int(stmt, 21, art->views);
    sqlite3_bind_int(stmt, 22, art->downloads);
    sqlite3_bind_text(stmt, 23, art->issue_index, -1, SQLITE_STATIC);
    
    int rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);
    return (rc == SQLITE_DONE) ? 0 : -1;
}

int save_author(sqlite3 *db, const char *doi, const char *name, int order) {
    sqlite3_stmt *stmt;
    const char *sql = "INSERT INTO authors (article_doi, author_name, author_order) "
                      "VALUES (?, ?, ?)";
    sqlite3_prepare_v2(db, sql, -1, &stmt, NULL);
    sqlite3_bind_text(stmt, 1, doi, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 2, name, -1, SQLITE_STATIC);
    sqlite3_bind_int(stmt, 3, order);
    int rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);
    return (rc == SQLITE_DONE) ? 0 : -1;
}
```

### 13.8 主流程

```c
#define BASE_URL "https://www.sciopen.com"
#define JOURNAL_ID "1396776045425197058"
#define ISSN "2226-4108"

int main(int argc, char *argv[]) {
    curl_global_init(CURL_GLOBAL_DEFAULT);
    sqlite3 *db;
    sqlite3_open("jac_articles.db", &db);
    
    // 创建表
    // ... (执行上面的 CREATE TABLE SQL)
    
    // Step 1: 遍历年份获取期次
    for (int year = 2012; year <= 2026; year++) {
        char url[512];
        snprintf(url, sizeof(url),
            "%s/journal/join_journal/archive?journalId=%s&volume=%d&issn=%s",
            BASE_URL, JOURNAL_ID, year, ISSN);
        
        printf("Fetching year %d...\n", year);
        char *html = fetch_url(url);
        if (!html) continue;
        
        // 解析 issueIndex 列表
        // ... (用 libxml2 XPath 提取 issueIndex)
        
        // Step 2: 遍历每期获取文章列表
        // for each issue_index:
        //     fetch stage_page?stage=5&issueIndex=xxx
        //     提取所有 DOI
        
        // Step 3: 获取每篇文章详情
        // for each doi:
        //     fetch /article/{doi}
        //     parse_article_page(html, &article)
        //     save_article(db, &article)
        //     for each author:
        //         save_author(db, doi, author, order)
        
        free(html);
        sleep(1); // 礼貌间隔
    }
    
    sqlite3_close(db);
    curl_global_cleanup();
    return 0;
}
```

### 13.9 导出为 JSON

```c
int export_to_json(sqlite3 *db, const char *output_file) {
    FILE *f = fopen(output_file, "w");
    fprintf(f, "[\n");
    
    sqlite3_stmt *stmt;
    sqlite3_prepare_v2(db,
        "SELECT doi, title, article_type, volume, issue_num, firstpage, "
        "publication_date, online_date, abstract, keywords, pdf_url, page_url "
        "FROM articles ORDER BY volume, issue_num, firstpage", -1, &stmt, NULL);
    
    int first = 1;
    while (sqlite3_step(stmt) == SQLITE_ROW) {
        if (!first) fprintf(f, ",\n");
        first = 0;
        
        cJSON *obj = cJSON_CreateObject();
        cJSON_AddStringToObject(obj, "doi", (char *)sqlite3_column_text(stmt, 0));
        cJSON_AddStringToObject(obj, "title", (char *)sqlite3_column_text(stmt, 1));
        cJSON_AddStringToObject(obj, "type", (char *)sqlite3_column_text(stmt, 2));
        cJSON_AddNumberToObject(obj, "volume", sqlite3_column_int(stmt, 3));
        cJSON_AddNumberToObject(obj, "issue", sqlite3_column_int(stmt, 4));
        cJSON_AddStringToObject(obj, "firstpage", (char *)sqlite3_column_text(stmt, 5));
        cJSON_AddStringToObject(obj, "pub_date", (char *)sqlite3_column_text(stmt, 6));
        cJSON_AddStringToObject(obj, "online_date", (char *)sqlite3_column_text(stmt, 7));
        cJSON_AddStringToObject(obj, "abstract", (char *)sqlite3_column_text(stmt, 8));
        cJSON_AddStringToObject(obj, "keywords", (char *)sqlite3_column_text(stmt, 9));
        cJSON_AddStringToObject(obj, "pdf_url", (char *)sqlite3_column_text(stmt, 10));
        cJSON_AddStringToObject(obj, "page_url", (char *)sqlite3_column_text(stmt, 11));
        
        char *json_str = cJSON_PrintUnformatted(obj);
        fprintf(f, "%s", json_str);
        cJSON_free(json_str);
        cJSON_Delete(obj);
    }
    
    fprintf(f, "\n]\n");
    fclose(f);
    sqlite3_finalize(stmt);
    return 0;
}
```

### 13.10 依赖安装

```bash
# Ubuntu/Debian
sudo apt-get install libcurl4-openssl-dev libxml2-dev libsqlite3-dev libcjson-dev

# CentOS/RHEL
sudo yum install libcurl-devel libxml2-devel sqlite-devel cJSON-devel

# Arch
sudo pacman -S curl libxml2 sqlite cjson

# macOS
brew install curl libxml2 sqlite cjson
```

### 13.11 项目文件结构建议

```
jac_scraper/
├── src/
│   ├── main.c           # 主流程控制
│   ├── fetch.c/.h       # HTTP 请求封装 (libcurl)
│   ├── parse.c/.h       # HTML 解析 (libxml2)
│   ├── db.c/.h          # SQLite 操作
│   ├── export.c/.h      # JSON/CSV 导出
│   └── types.h          # 数据结构定义
├── data/
│   └── jac_articles.db  # SQLite 数据库
├── output/
│   └── jac_articles.json # 导出的 JSON
├── Makefile
└── README.md
```

### 13.12 Makefile

```makefile
CC = gcc
CFLAGS = -Wall -O2 -I/usr/include/libxml2
LDFLAGS = -lcurl -lxml2 -lsqlite3 -lcjson
TARGET = jac_scraper
SRC = src/main.c src/fetch.c src/parse.c src/db.c src/export.c

$(TARGET): $(SRC)
	$(CC) $(CFLAGS) -o $@ $^ $(LDFLAGS)

clean:
	rm -f $(TARGET)

run: $(TARGET)
	./$(TARGET)

export: $(TARGET)
	./$(TARGET) --export
```

---

## 十四、C vs Python 性能对比 (此场景)

| 指标 | C (libcurl + libxml2) | Python (requests + bs4) |
|------|----------------------|------------------------|
| 单页请求+解析 | ~0.3s | ~0.5s |
| 1500篇总耗时 | ~8-10分钟 | ~15-20分钟 |
| 内存占用 | ~5MB | ~50MB |
| 二进制大小 | ~200KB | N/A (需 Python 环境) |
| 部署 | 单文件，拷贝即用 | 需 pip install |
| 开发时间 | 2-3天 | 0.5-1天 |
| 维护难度 | 中等 | 低 |

> 结论: C 适合追求轻量部署和低资源占用的场景。1500 篇文章两者都在可接受范围内。

---

## 十五、robots.txt 分析

```
https://www.sciopen.com/robots.txt
```

### 15.1 允许/禁止规则总结

| User-Agent | 规则 | 说明 |
|------------|------|------|
| `Googlebot` | **Allow** | 搜索引擎可爬 |
| `Bingbot` | **Allow** | 搜索引擎可爬 |
| `*` (其他所有) | **Allow** | 默认允许 |
| `GPTBot` | **Disallow** | OpenAI 爬虫禁止 |
| `ClaudeBot` | **Disallow** | Anthropic 爬虫禁止 |
| `anthropic-ai` | **Disallow** | Anthropic 爬虫禁止 |
| `ChatGPT-User` | **Disallow** | OpenAI 爬虫禁止 |
| `FacebookBot` | **Disallow** | Meta 爬虫禁止 |
| `Bytespider` | **Disallow** | 字节跳动爬虫禁止 |
| `CCBot` | **Disallow** | Common Crawl 禁止 |
| `Amazonbot` | **Disallow** | Amazon 爬虫禁止 |
| `PerplexityBot` | **Disallow** | Perplexity 禁止 |
| 其他 AI 爬虫 | **Disallow** | 全部禁止 |

### 15.2 允许爬取的路径 (通用 User-Agent)

```
Allow: /
Allow: /sitemap*
Allow: /home
Allow: /article_pdf/
Allow: /local/article_pdf/
Allow: /meeting/
Allow: /journal/
Allow: /search/
Allow: /article/
Allow: /scholar/
```

### 15.3 Sitemap

```
Sitemap: https://www.sciopen.com/sitemap.xml
```

> Sitemap 包含全站所有页面 URL，可直接用于批量获取文章链接。

### 15.4 对爬虫开发的影响

| 要点 | 说明 |
|------|------|
| **设置正常的 User-Agent** | 使用 `Mozilla/5.0 ...` 等浏览器 UA，不要用 AI 爬虫标识 |
| **所有文章页均可爬** | `/article/` 路径明确 Allow |
| **PDF 可直接下载** | `/article_pdf/` 和 `/local/article_pdf/` 均 Allow |
| **Sitemap 可用** | 可先从 sitemap.xml 获取所有文章 URL 列表 |
| **无频率限制声明** | robots.txt 中未写 crawl-delay，但建议保持 1-2 秒间隔 |
| **不要伪装 AI 爬虫** | 确保 User-Agent 不包含被禁止的关键词 |

### 15.5 推荐的 User-Agent

```c
#define USER_AGENT "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
```

---

## 十六、Altmetric 数据抓取方案 (已验证可行)

### 16.1 结论

| 方案 | 结果 |
|------|------|
| Altmetric API (`api.altmetric.com`) | 403 需付费 Key |
| Altmetric 网站直接爬取 | 404 反爬拦截 |
| SciOpen 内部接口 `/article/altmetric` | 返回 0，JAC 覆盖率低 |
| **Playwright 渲染页面提取** | **可行，已验证** |

### 16.2 原理

SciOpen 文章页通过 JS 加载 Altmetric 徽章:
```html
<div class="altmetric-embed" data-doi="10.26599/JAC.2025.9221226"></div>
```

Altmetric JS 加载后渲染一个 `<img>` 标签，其 `alt` 属性包含分数:
```html
<img alt="Article has an altmetric score of 2" src="https://badges.altmetric.com/?size=128&score=2&types=tttttttt">
```

- 有提及时: `alt="Article has an altmetric score of N"`
- 无提及时: 元素添加 `altmetric-hidden` 类，`img` 不存在

### 16.3 实测结果 (2025年 JAC 文章)

| DOI | Altmetric Score | 说明 |
|-----|----------------|------|
| 10.26599/JAC.2025.9221226 | **2** | 有 3 条 Twitter 提及 |
| 10.26599/JAC.2025.9221192 | 0 | 无社媒提及 |
| 10.26599/JAC.2025.9221195 | 0 | 无社媒提及 |
| 10.26599/JAC.2025.9221196 | 0 | 无社媒提及 |
| 10.26599/JAC.2026.9221301 | 0 | 文章太新 |

> JAC 期刊 Altmetric 覆盖率较低，大部分文章得分为 0。

### 16.4 Python Playwright 提取代码

```python
import asyncio
from playwright.async_api import async_playwright

async def get_altmetric_score(doi: str) -> int:
    """通过 Playwright 获取单篇文章的 Altmetric 分数"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            executable_path="/path/to/chrome"  # 根据实际路径修改
        )
        page = await browser.new_page()
        url = f"https://www.sciopen.com/article/{doi}"

        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(6000)  # 等待 Altmetric JS 加载

            score = await page.evaluate("""() => {
                const el = document.querySelector('.altmetric-embed');
                if (!el) return 0;
                const img = el.querySelector('img');
                if (!img || !img.alt) return 0;
                const match = img.alt.match(/score of (\\d+)/);
                return match ? parseInt(match[1]) : 0;
            }""")
            return score
        finally:
            await page.close()
            await browser.close()
```

### 16.5 C 语言实现思路

C 程序无法直接用 Playwright，但有两种替代方式:

**方式 A: C 主程序 + Python 子进程**
```c
// C 程序调用 Python 脚本获取 Altmetric 分数
char cmd[512];
snprintf(cmd, sizeof(cmd),
    "python3 get_altmetric.py '%s' 2>/dev/null", doi);
FILE *fp = popen(cmd, "r");
fscanf(fp, "%d", &altmetric_score);
pclose(fp);
```

**方式 B: 全部用 Python 做 Altmetric 部分**
- 主爬虫用 C (libcurl) 抓取文章元数据
- 单独用 Python Playwright 批量获取 Altmetric 分数
- 最后合并数据到 SQLite

### 16.6 批量抓取性能估算

```
单篇耗时: ~8 秒 (加载 3s + 等待 5s)
1500 篇:  ~3.3 小时 (串行)
4 并发:    ~50 分钟
8 并发:    ~25 分钟

建议: 只对有 Altmetric 覆盖的文章抓取 (预计 200-400 篇)
实际耗时: ~30-60 分钟
```
