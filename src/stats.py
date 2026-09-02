#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
stats.py — 生成统计报告（CLI 打印版）
"""
import sqlite3, sys
from pathlib import Path
from collections import Counter

DB_PATH = Path(__file__).parent.parent / "jac_articles.db"

def get_stats(conn: sqlite3.Connection) -> dict:
    c = conn.cursor()

    total = c.execute("SELECT COUNT(*) FROM articles").fetchone()[0]
    years = c.execute("SELECT year, COUNT(*) FROM articles GROUP BY year ORDER BY year DESC").fetchall()
    types = c.execute("SELECT type, COUNT(*) FROM articles GROUP BY type ORDER BY COUNT(*) DESC").fetchall()
    areas = c.execute("SELECT research_area, research_area_zh, COUNT(*) FROM articles GROUP BY research_area ORDER BY COUNT(*) DESC").fetchall()

    # Top authors
    authors_flat = []
    for row in c.execute("SELECT authors FROM articles WHERE authors != ''"):
        for a in row[0].split(","):
            a = a.strip()
            if a: authors_flat.append(a)
    top_authors = Counter(authors_flat).most_common(10)

    return {
        "total": total,
        "years": dict(years),
        "types": dict(types),
        "areas": areas,
        "top_authors": top_authors,
    }


def main():
    conn = sqlite3.connect(str(DB_PATH))

    stats = get_stats(conn)

    print("=" * 60)
    print("  JAC Article Statistics")
    print("=" * 60)
    print(f"\nTotal articles: {stats['total']}")

    print(f"\nBy Year:")
    for yr, cnt in sorted(stats["years"].items(), reverse=True):
        print(f"  {yr}: {cnt}")

    print(f"\nBy Type:")
    for t, cnt in stats["types"].items():
        print(f"  {t}: {cnt}")

    print(f"\nBy Research Area:")
    for area, area_zh, cnt in stats["areas"]:
        print(f"  [{cnt:3d}] {area_zh} / {area}")

    print(f"\nTop Authors:")
    for author, cnt in stats["top_authors"]:
        print(f"  {cnt:3d}  {author[:50]}")

    conn.close()


if __name__ == "__main__":
    main()
