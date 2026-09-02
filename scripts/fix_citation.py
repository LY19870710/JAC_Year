#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""重新生成 citation 字段，与 sciopen 格式一致
格式: Li Y, Zhang M, Chen J, et al. Title. Journal of Advanced Ceramics, 2025, 14(12): 9221194. https://doi.org/10.26599/JAC.2025.9221194
"""
import sqlite3, re, html as _html
from pathlib import Path

DB_PATH = Path(r"E:\Claw\JAC_Year\jac_articles.db")

def format_author_abbreviated(authors_str):
    """Yunfei He, Dongdong Liu → He Y, Liu D"""
    if not authors_str:
        return ""
    parts = [a.strip() for a in authors_str.split(",")]
    result = []
    for au in parts:
        if not au or au == "[...]":
            continue
        words = au.rsplit(" ", 1)
        if len(words) == 2:
            last, first = words[1], words[0]
            result.append(f"{last} {first[0]}")
        else:
            result.append(au)
    
    if len(result) > 3:
        return ", ".join(result[:3]) + ", et al"
    return ", ".join(result)

def extract_article_number(doi):
    """从 DOI 提取文章编号: 10.26599/JAC.2025.9221194 → 9221194"""
    if not doi:
        return ""
    m = re.search(r'JAC\.\d{4}\.(\d+)', doi)
    return m.group(1) if m else ""

def clean_title(title):
    """清除 HTML 标签"""
    if not title:
        return ""
    return re.sub(r'<[^>]+>', '', title).strip()

def build_citation(row):
    authors = row["authors"]
    title = clean_title(row["title"])
    volume = row["volume"]
    issue = row["issue"]
    year = row["year"]
    doi = row["doi"]
    
    au_str = format_author_abbreviated(authors)
    art_num = extract_article_number(doi)
    
    # 格式: Authors. Title. Journal of Advanced Ceramics, Year, Vol(Issue): ArtNum. DOI
    parts = []
    if au_str:
        parts.append(au_str + ".")
    if title:
        parts.append(title + ".")
    parts.append("Journal of Advanced Ceramics,")
    
    vol_str = f"{year}"
    if volume:
        vol_str += f", {volume}"
        if issue:
            vol_str += f"({issue})"
    if art_num:
        vol_str += f": {art_num}"
    vol_str += "."
    parts.append(vol_str)
    
    if doi:
        parts.append(f"https://doi.org/{doi}")
    
    return " ".join(parts)

def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT id, authors, title, volume, issue, year, doi FROM articles").fetchall()
    
    updated = 0
    for row in rows:
        citation = build_citation(row)
        conn.execute("UPDATE articles SET citation = ? WHERE id = ?", (citation, row["id"]))
        updated += 1
    
    conn.commit()
    print(f"Updated {updated} citations")
    
    # 验证几条
    samples = conn.execute("SELECT doi, citation FROM articles LIMIT 5").fetchall()
    for s in samples:
        print(f"\nDOI: {s['doi']}")
        print(f"Citation: {s['citation']}")

if __name__ == "__main__":
    main()
