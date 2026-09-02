#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fetch.py — JAC_Year v0.3.0 抓取器
策略：
  1. 访问 archive?volume=XXXX 页面，提取所有 stage_page issueIndex 链接
  2. 对每个 issue 调用 scrape.js 抓取文章
  3. 自动分类研究方向
  4. 存入 SQLite 数据库

v0.3.0 新增：
  - corresponding_json 字段（JSON格式通讯作者-邮箱对应）
  - funding 字段（从详情页抓取）
"""
import sys, os, json, subprocess, sqlite3
from pathlib import Path
from datetime import datetime

# 路径配置
HERE         = Path(__file__).parent
ROOT         = HERE.parent
SCRAPE_JS    = ROOT.parent / "sciopen-scraper-html" / "scrape.js"
NODE_MODULES = ROOT.parent / "sciopen_scraper" / "node_modules"
DB_PATH      = ROOT / "jac_articles.db"

JAC_JOURNAL_ID = "1396776045425197058"
JAC_ISSN       = "2226-4108"

sys.path.insert(0, str(HERE))
from classify import classify_batch


# ─── 数据库 ───────────────────────────────────────────────────

def init_db(conn: sqlite3.Connection):
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year INTEGER NOT NULL,
        volume INTEGER,
        issue INTEGER,
        month TEXT,
        title TEXT NOT NULL,
        authors TEXT,
        affiliations TEXT,
        corresponding_author TEXT,
        corresponding_email TEXT,
        doi TEXT UNIQUE NOT NULL,
        type TEXT,
        url TEXT,
        research_area_id INTEGER DEFAULT 0,
        research_area TEXT DEFAULT 'Other',
        research_area_zh TEXT DEFAULT '其他',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_year ON articles(year);
    CREATE INDEX IF NOT EXISTS idx_type ON articles(type);
    CREATE INDEX IF NOT EXISTS idx_area ON articles(research_area_id);
    CREATE INDEX IF NOT EXISTS idx_doi  ON articles(doi);
    """)
    # 兼容旧数据库：添加新列（如果不存在）
    for col_def in [
        "corresponding_author TEXT DEFAULT ''",
        "corresponding_email TEXT DEFAULT ''",
        "corresponding_authors TEXT DEFAULT ''",
        "corresponding_emails TEXT DEFAULT ''",
        "corresponding_json TEXT DEFAULT '[]'",
        "funding TEXT DEFAULT ''",
    ]:
        col_name = col_def.split()[0]
        try:
            conn.execute(f"ALTER TABLE articles ADD COLUMN {col_def}")
            conn.commit()
        except:
            pass
    conn.commit()


def build_corresponding_json(authors_str: str, emails_str: str) -> str:
    """将分号分隔的通讯作者和邮箱合并为 JSON"""
    import json as _json
    authors = [a.strip() for a in (authors_str or '').split(';') if a.strip()]
    emails  = [e.strip() for e in (emails_str  or '').split(';') if e.strip()]
    result = [{'name': n, 'email': emails[i] if i < len(emails) else ''} for i, n in enumerate(authors)]
    return _json.dumps(result, ensure_ascii=False)


def insert_article(conn: sqlite3.Connection, a: dict) -> bool:
    try:
        corr_json = build_corresponding_json(
            a.get("corresponding_authors", "") or a.get("corresponding_author", ""),
            a.get("corresponding_emails", "") or a.get("corresponding_email", ""),
        )
        conn.execute("""
            INSERT OR IGNORE INTO articles
            (year, volume, issue, month, title, authors, affiliations, corresponding_author,
             corresponding_email, corresponding_authors, corresponding_emails, corresponding_json,
             doi, type, url, research_area_id, research_area, research_area_zh, funding)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            a.get("year"), a.get("volume"), a.get("issue"), a.get("month"),
            a.get("title",""), a.get("authors",""),
            a.get("affiliations",""),
            a.get("corresponding_author",""),
            a.get("corresponding_email",""),
            a.get("corresponding_authors",""),
            a.get("corresponding_emails",""),
            corr_json,
            a.get("doi",""), a.get("type","Research Article"), a.get("url",""),
            a.get("research_area_id", 0), a.get("research_area","Other"), a.get("research_area_zh","其他"),
            a.get("funding",""),
        ))
        conn.commit()
        return conn.execute("SELECT changes()").fetchone()[0] > 0
    except Exception as e:
        print(f"  DB error: {e}")
        return False


# ─── 详情页抓取 ──────────────────────────────────────────────

FETCH_DETAIL_JS = NODE_MODULES.parent / "fetch_detail.js"

def enrich_with_details(articles: list) -> list:
    """批量抓取文章详情页，补充机构和通讯作者信息"""
    import tempfile
    # 写临时 JSON 文件
    tmp = Path(tempfile.mktemp(suffix=".json"))
    tmp.write_text(json.dumps([{"doi": a["doi"], "url": a["url"]} for a in articles]), encoding="utf-8")

    for attempt in range(1, 4):
        result = subprocess.run(
            ["node", str(FETCH_DETAIL_JS), "--batch", str(tmp)],
            capture_output=True, timeout=300,
            cwd=str(NODE_MODULES.parent),
            env={**os.environ, "NODE_PATH": str(NODE_MODULES)}
        )
        if result.returncode == 0:
            break
        print(f"    detail fetch attempt {attempt} failed: {result.stderr.decode('utf-8', errors='ignore')[:80]}")
        if attempt < 3:
            import time; time.sleep(5)
    tmp.unlink(missing_ok=True)

    if result.returncode != 0:
        print(f"    Warning: detail fetch failed: {result.stderr.decode('utf-8', errors='ignore')[:100]}")
        return articles

    details = json.loads(result.stdout.decode("utf-8"))
    enriched = []
    for a in articles:
        d = details.get(a["doi"], {})
        enriched.append({
            **a,
            "affiliations": d.get("affiliations", ""),
            "corresponding_author": d.get("corresponding_author", ""),
            "corresponding_email": d.get("corresponding_email", ""),
        })
    return enriched


# ─── 获取 issue 列表 ──────────────────────────────────────────

def get_issue_urls(year: int) -> list[dict]:
    """从 archive 页面提取该年所有 issue 的 stage_page URL（调用 Node.js，最多重试 3 次）"""
    GET_ISSUES_JS = NODE_MODULES.parent / "get_issues.js"
    for attempt in range(1, 4):
        result = subprocess.run(
            ["node", str(GET_ISSUES_JS), str(year)],
            capture_output=True, timeout=120,
            cwd=str(NODE_MODULES.parent),
            env={**os.environ, "NODE_PATH": str(NODE_MODULES)}
        )
        if result.returncode == 0:
            return json.loads(result.stdout.decode("utf-8"))
        err = result.stderr.decode("utf-8", errors="ignore")[:150]
        print(f"    get_issue_urls attempt {attempt} failed: {err}")
        if attempt < 3:
            import time; time.sleep(5)
    raise RuntimeError(f"get_issue_urls failed after 3 attempts")


# ─── 抓取单期文章 ─────────────────────────────────────────────

def scrape_issue(url: str) -> dict:
    """调用 scrape.js 抓取单期文章（最多重试 3 次）"""
    for attempt in range(1, 4):
        result = subprocess.run(
            ["node", str(SCRAPE_JS), url],
            capture_output=True, timeout=90,
            cwd=str(NODE_MODULES.parent),
            env={**os.environ, "NODE_PATH": str(NODE_MODULES)}
        )
        if result.returncode == 0:
            return json.loads(result.stdout.decode("utf-8"))
        err = result.stderr.decode("utf-8", errors="ignore")[:150]
        print(f"    scrape_issue attempt {attempt} failed: {err}")
        if attempt < 3:
            import time; time.sleep(5)
    raise RuntimeError(f"scrape_issue failed after 3 attempts")


# ─── 主流程 ──────────────────────────────────────────────────

def fetch_year(year: int, conn: sqlite3.Connection, fetch_detail: bool = False) -> int:
    print(f"\nFetching year {year}...")

    # 1. 获取 issue 列表
    issues = get_issue_urls(year)
    if not issues:
        print(f"  No issues found for {year}")
        return 0

    print(f"  Found {len(issues)} issues")

    total = 0
    for i, issue_info in enumerate(issues, 1):
        print(f"\n  [{i}/{len(issues)}] {issue_info['text'][:50]}")
        try:
            data = scrape_issue(issue_info["url"])
            ji = data.get("journalInfo", {})
            articles = data.get("articles", [])

            # 补充期刊信息
            for a in articles:
                a["year"]   = year
                a["volume"] = ji.get("volume")
                a["issue"]  = ji.get("issue")
                a["month"]  = ji.get("month")

            # 分类研究方向
            articles = classify_batch(articles)

            # 过滤 Technical Paper
            articles = [a for a in articles if a.get("type") != "Technical Paper"]

            # 可选：抓取详情页（机构信息）
            if fetch_detail and articles:
                articles = enrich_with_details(articles)

            # 存入数据库
            saved = 0
            for a in articles:
                if insert_article(conn, a):
                    saved += 1

            print(f"    {len(articles)} articles, {saved} new saved")
            total += saved

        except Exception as e:
            print(f"    ERROR: {e}")
            continue

    return total


def main():
    if len(sys.argv) < 2:
        print("Usage: python src/fetch.py <year> [year2 ...] [--detail]")
        print("  --detail  Also fetch affiliations from article detail pages (slower)")
        print("Example: python src/fetch.py 2025")
        print("         python src/fetch.py 2025 --detail")
        sys.exit(1)

    args = sys.argv[1:]
    fetch_detail_flag = "--detail" in args
    years = [int(y) for y in args if y.isdigit()]

    conn = sqlite3.connect(str(DB_PATH))
    init_db(conn)

    print(f"JAC_Year v0.2.1 (Linux)")
    print(f"DB: {DB_PATH}")
    print(f"Years: {years}")
    if fetch_detail_flag:
        print(f"Mode: fetch affiliations from detail pages (slow)")

    grand_total = 0
    for year in years:
        count = fetch_year(year, conn, fetch_detail=fetch_detail_flag)
        grand_total += count
        print(f"\nYear {year}: {count} new articles saved")

    conn.close()
    print(f"\nTotal: {grand_total} new articles saved")


if __name__ == "__main__":
    main()
