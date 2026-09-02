#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sciopen_scraper.py — SciOpen期刊文章抓取器
抓取 Journal of Advanced Ceramics 的文章信息
"""
import re
import json
import time
import sqlite3
import requests
from pathlib import Path
from datetime import datetime
from html import unescape

# 配置
BASE_URL = "https://www.sciopen.com"
JOURNAL_ID = "1396776045425197058"
ISSN = "2226-4108"
DB_PATH = Path(__file__).parent.parent / "jac_articles.db"

# 请求头
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}


def get_page(stage=5, issue_index=None):
    """获取期刊文章列表页"""
    url = f"{BASE_URL}/journal/join_journal/stage_page"
    params = {
        "stage": stage,  # 5=Latest Issue, 4=Online First, 2=Just Accepted
        "id": JOURNAL_ID,
        "issn": ISSN,
    }
    if issue_index:
        params["issueIndex"] = issue_index
    
    resp = requests.get(url, params=params, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return resp.text


def parse_article_list(html):
    """从列表页HTML中解析文章列表"""
    # 提取 page 变量中的JSON数据
    match = re.search(r'var page = (\[.*?\]);', html, re.DOTALL)
    if not match:
        return []
    
    try:
        articles = json.loads(match.group(1))
    except json.JSONDecodeError:
        return []
    
    return articles


def get_article_detail(doi):
    """获取单篇文章详情页"""
    url = f"{BASE_URL}/article/{doi}"
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return resp.text


def parse_article_detail(html):
    """从详情页HTML中解析文章详细信息"""
    info = {}
    
    # 提取作者机构
    affiliations = []
    for m in re.finditer(r'class="art-authors-unit-item"[^>]*>(.*?)</div>', html, re.S):
        aff_text = re.sub(r'<[^>]+>', '', m.group(1)).strip()
        # 去掉开头的数字编号
        aff_text = re.sub(r'^\d+\s*', '', aff_text).strip()
        if aff_text:
            affiliations.append(aff_text)
    info["affiliations"] = "; ".join(affiliations)
    
    # 提取作者邮箱
    emails = []
    for m in re.finditer(r'class="art-authors-email"[^>]*>.*?href="mailto:([^"]+)"', html, re.S):
        email = m.group(1).strip()
        if email:
            emails.append(email)
    info["emails"] = "; ".join(emails)
    
    # 提取关键词
    keywords = []
    for m in re.finditer(r'class="v4-art-keyword-item"[^>]*>(.*?)</a>', html, re.S):
        kw = re.sub(r'<[^>]+>', '', m.group(1)).strip()
        if kw:
            keywords.append(kw)
    info["keywords"] = "; ".join(keywords)
    
    # 提取摘要
    match = re.search(r'class="v4-art-abstract"[^>]*>.*?<div[^>]*>(.*?)</div>', html, re.S)
    if match:
        abstract = re.sub(r'<[^>]+>', '', match.group(1)).strip()
        info["abstract"] = unescape(abstract)
    else:
        info["abstract"] = ""
    
    # 提取引用格式
    match = re.search(r'name="article_references"\s+content="([^"]*)"', html)
    if match:
        info["citation"] = unescape(match.group(1))
    else:
        info["citation"] = ""
    
    # 提取PDF链接
    match = re.search(r'name="citation_pdf_url"\s+content="([^"]*)"', html)
    if match:
        info["pdf_url"] = match.group(1)
    else:
        info["pdf_url"] = ""
    
    # 提取基金信息（从acknowledgements或funding部分）
    funding_match = re.search(r'(?:Funding|基金)[^<]*</[^>]+>(.*?)</div>', html, re.I | re.S)
    if funding_match:
        funding = re.sub(r'<[^>]+>', '', funding_match.group(1)).strip()
        info["funding"] = unescape(funding)
    else:
        info["funding"] = ""
    
    return info


def init_db():
    """初始化数据库"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("""
        CREATE TABLE IF NOT EXISTS sciopen_articles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            article_id TEXT UNIQUE,
            doi TEXT,
            title TEXT,
            type TEXT,
            authors TEXT,
            affiliations TEXT,
            emails TEXT,
            keywords TEXT,
            abstract TEXT,
            citation TEXT,
            funding TEXT,
            pdf_url TEXT,
            pub_time TEXT,
            volume TEXT,
            issue TEXT,
            click_num INTEGER DEFAULT 0,
            download_num INTEGER DEFAULT 0,
            is_oa INTEGER DEFAULT 1,
            pdf_size TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    return conn


def save_article(conn, article, detail_info):
    """保存文章到数据库"""
    try:
        # 构建完整作者列表
        authors = ""
        if article.get("firstAuthorName"):
            authors = article["firstAuthorName"]
        if article.get("twoAuthorName"):
            authors += article["twoAuthorName"]
        if article.get("lastAuthorName"):
            authors += article["lastAuthorName"]
        authors = authors.strip().rstrip(",")
        
        conn.execute("""
            INSERT OR REPLACE INTO sciopen_articles 
            (article_id, doi, title, type, authors, affiliations, emails, 
             keywords, abstract, citation, funding, pdf_url, pub_time,
             volume, issue, click_num, download_num, is_oa, pdf_size, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            article.get("id"),
            article.get("doi"),
            article.get("title"),
            article.get("type"),
            authors,
            detail_info.get("affiliations", ""),
            detail_info.get("emails", ""),
            detail_info.get("keywords", ""),
            detail_info.get("abstract", ""),
            detail_info.get("citation", ""),
            detail_info.get("funding", ""),
            detail_info.get("pdf_url", ""),
            article.get("pubTime"),
            article.get("journalAndIssue", "").split(",")[0].strip() if article.get("journalAndIssue") else "",
            article.get("journalAndIssue", "").split(",")[1].strip().split(":")[0].strip() if article.get("journalAndIssue") else "",
            article.get("clickNum", 0),
            article.get("downloadNum", 0),
            article.get("isOa", 1),
            article.get("pdfSize", ""),
            datetime.now().isoformat(),
        ))
        conn.commit()
        return True
    except Exception as e:
        print(f"  DB error: {e}")
        return False


def scrape_stage(stage=5, issue_index=None, fetch_detail=True, delay=1):
    """抓取指定阶段的文章"""
    stage_names = {5: "Latest Issue", 4: "Online First", 2: "Just Accepted"}
    print(f"\n=== 抓取 {stage_names.get(stage, stage)} ===")
    
    # 获取列表页
    html = get_page(stage, issue_index)
    articles = parse_article_list(html)
    print(f"Found {len(articles)} articles")
    
    if not articles:
        return 0
    
    # 初始化数据库
    conn = init_db()
    saved = 0
    
    for i, article in enumerate(articles, 1):
        doi = article.get("doi", "")
        title = article.get("title", "")[:60]
        print(f"\n[{i}/{len(articles)}] {title}...")
        
        # 获取详情页
        detail_info = {}
        if fetch_detail and doi:
            try:
                detail_html = get_article_detail(doi)
                detail_info = parse_article_detail(detail_html)
                print(f"  Affiliations: {detail_info.get('affiliations', '')[:80]}")
                print(f"  Keywords: {detail_info.get('keywords', '')[:80]}")
                time.sleep(delay)
            except Exception as e:
                print(f"  Detail fetch error: {e}")
        
        # 保存到数据库
        if save_article(conn, article, detail_info):
            saved += 1
            print(f"  Saved!")
    
    conn.close()
    print(f"\nTotal saved: {saved}")
    return saved


def main():
    import argparse
    parser = argparse.ArgumentParser(description="SciOpen Journal Scraper")
    parser.add_argument("--stage", type=int, default=5, choices=[2, 4, 5],
                       help="Article stage: 5=Latest, 4=Online First, 2=Just Accepted")
    parser.add_argument("--issue", type=str, default=None,
                       help="Issue index ID")
    parser.add_argument("--no-detail", action="store_true",
                       help="Skip fetching article details")
    parser.add_argument("--delay", type=float, default=1.0,
                       help="Delay between requests (seconds)")
    
    args = parser.parse_args()
    
    print("SciOpen Journal Scraper v0.1.0")
    print(f"Journal: Journal of Advanced Ceramics")
    print(f"ISSN: {ISSN}")
    print(f"DB: {DB_PATH}")
    
    saved = scrape_stage(
        stage=args.stage,
        issue_index=args.issue,
        fetch_detail=not args.no_detail,
        delay=args.delay,
    )
    
    print(f"\nDone! {saved} articles saved to database.")


if __name__ == "__main__":
    main()
