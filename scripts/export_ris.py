#!/usr/bin/env python3
"""
从 jac_articles.db 导出 RIS 格式文件。
标准参考：桌面 10.26599_JAC.2025.9221194.ris
字段：TY/AU/PY/TI/JO/SN/SP/VL/IS/AB/UR/DO
"""
import sqlite3
import re
import sys
import os

DB_PATH = r"E:\Claw\JAC_Year\jac_articles.db"
ISSN = "2226-4108"
JOURNAL = "Journal of Advanced Ceramics"

def clean_html(text):
    """去除 HTML 标签 + 解码 HTML 实体 + 解码 \\uXXXX 转义"""
    if not text:
        return ""
    import html as _html
    text = re.sub(r'<[^>]+>', '', text)
    text = _html.unescape(text)
    # 解码 \\uXXXX 形式的 Unicode 转义（数据库中存储的字面量）
    def _decode_u(m):
        return chr(int(m.group(1), 16))
    text = re.sub(r'\\u([0-9a-fA-F]{4})', _decode_u, text)
    text = text.strip()
    # 多空白压缩
    text = re.sub(r'\s+', ' ', text)
    return text

def get_article_number(doi):
    """从 DOI 提取文章编号作为 SP（起始页）"""
    if not doi:
        return ""
    # DOI 格式: 10.26599/JAC.2025.9221194
    m = re.search(r'JAC\.\d{4}\.(\d+)', doi)
    if m:
        return m.group(1)
    return ""

def get_year_from_doi(doi):
    """从 DOI 提取出版年份"""
    if not doi:
        return ""
    m = re.search(r'JAC\.(\d{4})', doi)
    if m:
        return m.group(1)
    return ""

def export_ris(output_dir=None, doi_filter=None, volume=None, issue=None):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    query = "SELECT doi, title, authors, volume, issue, year, abstract, keywords, url FROM articles WHERE 1=1"
    params = []
    
    if doi_filter:
        query += " AND doi = ?"
        params.append(doi_filter)
    if volume:
        query += " AND volume = ?"
        params.append(volume)
    if issue:
        query += " AND issue = ?"
        params.append(issue)
    
    query += " ORDER BY volume, issue, doi"
    c.execute(query, params)
    
    if output_dir is None:
        output_dir = os.path.dirname(DB_PATH)
    
    count = 0
    for row in c.fetchall():
        doi, title, authors, volume, issue, year, abstract, keywords, url = row
        
        article_num = get_article_number(doi)
        py = get_year_from_doi(doi) or str(year) if year else ""
        
        lines = []
        lines.append("TY  - JOUR")
        
        # Authors - 每人一行 AU，格式 Last, First；跳过 [...]
        if authors:
            for au in authors.split(", "):
                au = au.strip()
                if not au or au == "[...]":
                    continue
                parts = au.rsplit(" ", 1)
                if len(parts) == 2:
                    lines.append(f"AU  - {parts[1]}, {parts[0]}")
                else:
                    lines.append(f"AU  - {au}")
        
        if py:
            lines.append(f"PY  - {py}")
        
        lines.append(f"TI  - {clean_html(title) if title else ''}")
        lines.append(f"JO  - {JOURNAL}")
        lines.append(f"SN  - {ISSN}")
        
        if article_num:
            lines.append(f"SP  - {article_num}")
        if volume:
            lines.append(f"VL  - {volume}")
        if issue:
            lines.append(f"IS  - {issue}")
        
        if abstract:
            lines.append(f"AB  - {clean_html(abstract)}")
        
        if url:
            lines.append(f"UR  - {url}")
        if doi:
            lines.append(f"DO  - {doi}")
        
        lines.append("")  # 空行分隔
        
        # 文件名用 DOI 替换 / 为 _
        fname = doi.replace("/", "_") if doi else f"JAC_vol{volume}_iss{issue}_{count}"
        ris_path = os.path.join(output_dir, f"{fname}.ris")
        
        with open(ris_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
        
        count += 1
    
    conn.close()
    print(f"导出完成：{count} 篇 → {output_dir}")
    return count

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="JAC RIS 导出")
    parser.add_argument("--doi", help="指定单篇 DOI")
    parser.add_argument("--volume", type=int, help="卷号过滤")
    parser.add_argument("--issue", type=int, help="期号过滤")
    parser.add_argument("--outdir", help="输出目录")
    args = parser.parse_args()
    
    export_ris(
        output_dir=args.outdir,
        doi_filter=args.doi,
        volume=args.volume,
        issue=args.issue
    )
