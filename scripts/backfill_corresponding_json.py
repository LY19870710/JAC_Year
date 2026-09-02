#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
backfill_corresponding_json.py
回填 corresponding_json 字段：
将 corresponding_authors + corresponding_emails 合并为 JSON 格式
[{"name": "Zhang San", "email": "zs@xxx.edu"}, ...]
"""
import sqlite3, json, sys, os
sys.stdout.reconfigure(encoding='utf-8')

DB_PATH = 'jac_articles.db'

def build_json(authors_str: str, emails_str: str) -> str:
    """将分号分隔的作者和邮箱合并为 JSON"""
    authors = [a.strip() for a in (authors_str or '').split(';') if a.strip()]
    emails  = [e.strip() for e in (emails_str  or '').split(';') if e.strip()]
    
    result = []
    for i, name in enumerate(authors):
        email = emails[i] if i < len(emails) else ''
        result.append({'name': name, 'email': email})
    
    return json.dumps(result, ensure_ascii=False)

def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    
    rows = conn.execute(
        "SELECT id, corresponding_authors, corresponding_emails FROM articles"
    ).fetchall()
    
    updated = 0
    for row in rows:
        j = build_json(row['corresponding_authors'] or '', row['corresponding_emails'] or '')
        conn.execute(
            "UPDATE articles SET corresponding_json=? WHERE id=?",
            (j, row['id'])
        )
        updated += 1
    
    conn.commit()
    conn.close()
    
    print(f'[OK] Backfilled corresponding_json for {updated} articles')
    
    # 验证几条
    conn2 = sqlite3.connect(DB_PATH)
    conn2.row_factory = sqlite3.Row
    samples = conn2.execute(
        "SELECT doi, corresponding_json FROM articles WHERE corresponding_authors != '' LIMIT 3"
    ).fetchall()
    print('\nSample:')
    for s in samples:
        print(f'  {s["doi"]}')
        print(f'  {s["corresponding_json"]}')
    conn2.close()

if __name__ == '__main__':
    main()
