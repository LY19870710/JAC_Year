# -*- coding: utf-8 -*-
"""
update_categories.py - Update article categories in the database
based on th-jac.com mapping. For multi-category articles, use the first category.
"""
import json
import sqlite3

# Load the mapping
with open(r'D:\Claw\JAC_Year\thjac_mapping.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

mapping = data['mapping']
unmatched = data['unmatched']

print(f"Matched: {len(mapping)}")
print(f"Unmatched: {len(unmatched)} (will keep current category)")

# Connect to database
conn = sqlite3.connect(r'D:\Claw\JAC_Year\jac_articles.db')
c = conn.cursor()

# First, show current distribution
c.execute("SELECT research_area_zh, COUNT(*) FROM articles GROUP BY research_area_zh ORDER BY COUNT(*) DESC")
print("\nCurrent distribution:")
for row in c.fetchall():
    print(f"  {row[0]}: {row[1]}")

# Update matched articles
updated = 0
for local_id, cat_name in mapping.items():
    c.execute("UPDATE articles SET research_area_zh = ? WHERE id = ?", (cat_name, local_id))
    updated += 1

conn.commit()

# Show new distribution
c.execute("SELECT research_area_zh, COUNT(*) FROM articles GROUP BY research_area_zh ORDER BY COUNT(*) DESC")
print(f"\nUpdated {updated} articles. New distribution:")
for row in c.fetchall():
    print(f"  {row[0]}: {row[1]}")

# Verify
c.execute("SELECT COUNT(*) FROM articles WHERE research_area_zh IS NULL OR research_area_zh = ''")
null_count = c.fetchone()[0]
print(f"\nArticles with no category: {null_count}")

conn.close()
print("\nDone!")
