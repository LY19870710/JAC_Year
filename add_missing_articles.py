# -*- coding: utf-8 -*-
"""
add_missing_articles.py - Find articles on th-jac.com that are missing from local DB,
add them, then reclassify everything.
"""
import urllib.request
import json
import re
import sqlite3
import html

CATEGORIES = {
    "3i549s3ou4qr1l2": "高熵陶瓷的制备及工艺技术",
    "i8wlrq61x9c57de": "室温、高温及超高温结构陶瓷",
    "54233nsuqbw771m": "热障涂层、环境障涂层及其他保护性涂层",
    "v4l62c0n9sbl754": "MAX相、MAB相及其二维衍生物",
    "h65t401i76z1obd": "吸波陶瓷与透波陶瓷",
    "i8j6q42e3wa6z60": "透明陶瓷与发光陶瓷",
    "0109q82g6219j6z": "多孔陶瓷与多孔无机膜",
    "rohv3wqt9t02np8": "介电、压电、铁电及功能化耦合材料",
    "gwp99j7bzh76bdq": "无机纳米功能材料",
    "pj185071b17sm6p": "能源转换与能源存储材料",
    "pzy26s8p4s7kk9g": "多铁材料、磁性材料及超导材料",
    "v7kauxttuu933qg": "敏感材料及其应用",
    "r562d6m8d977l01": "环境净化与环境修复材料",
    "ws3ul5ml271j6sm": "玻璃、玻璃陶瓷及地质聚合物陶瓷",
    "4w880n4430j79p5": "生物陶瓷",
    "452ssk21sv001ry": "增材制造及3D/4D打印技术",
    "51m6f7o242j12d9": "工艺技术 (粉体、成型、烧结、连接等)",
    "01dg95gy3ju4zjx": "性能测试与评价技术",
    "18t9050waob1ep1": "材料计算与模拟",
}

BASE = "https://www.th-jac.com/hbr/paperlist/__data.json"
DB_PATH = r"D:\Claw\JAC_Year\jac_articles.db"

def strip_html(text):
    if not text:
        return ''
    text = html.unescape(text)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

# Step 1: Fetch all articles from th-jac.com
print("Fetching all articles from th-jac.com...")
thjac_all = {}  # doi → {title, link, categories: []}

for tagid, cat_name in CATEGORIES.items():
    url = f"{BASE}?tagid={tagid}&x-sveltekit-invalidated=00001"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode())
    
    nodes = data.get('nodes', [])
    if len(nodes) < 5:
        continue
    inner = nodes[4].get('data', [])
    ref_map = inner[0]
    papers = inner[1] if ref_map.get('papers') == 1 else inner[ref_map['papers']]
    
    for idx in papers:
        paper = inner[idx]
        p = {}
        for k, v in paper.items():
            if isinstance(v, int) and v < len(inner):
                p[k] = inner[v]
            elif isinstance(v, list):
                p[k] = [inner[i] if isinstance(i, int) and i < len(inner) else i for i in v]
            else:
                p[k] = v
        
        link = p.get('link', '')
        doi_match = re.search(r'(\d+\.\d+/JAC\.\d+\.\d+)', link)
        if doi_match:
            doi = doi_match.group(1)
            if doi not in thjac_all:
                thjac_all[doi] = {
                    'title': strip_html(p.get('info_en', '')),
                    'link': link,
                    'categories': [],
                    'year': p.get('year', 0),
                    'number': p.get('number', 0),
                    'page': p.get('page', 0),
                    'publish_time': p.get('publish_time', ''),
                    'quote': strip_html(p.get('quote', '')),
                    'info_zh': strip_html(p.get('info_zh', '')),
                }
            thjac_all[doi]['categories'].append(cat_name)

print(f"Total unique articles on th-jac.com: {len(thjac_all)}")

# Step 2: Find missing articles
conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

c.execute("SELECT doi FROM articles")
local_dois = set(row[0] for row in c.fetchall())

missing_dois = set(thjac_all.keys()) - local_dois
print(f"Local articles: {len(local_dois)}")
print(f"Missing articles to add: {len(missing_dois)}")

# Step 3: Add missing articles to database
added = 0
for doi in sorted(missing_dois):
    info = thjac_all[doi]
    # Use the first category as primary
    primary_cat = info['categories'][0] if info['categories'] else '其他'
    
    c.execute("""
        INSERT INTO articles (title, doi, research_area_zh, year, url, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
    """, (
        info['title'],
        doi,
        primary_cat,
        info['year'],
        info['link'],
    ))
    added += 1
    print(f"  Added: {doi} - {info['title'][:50]}")

conn.commit()
print(f"\nAdded {added} new articles")

# Step 4: Reclassify ALL articles based on th-jac.com
updated = 0
for doi, info in thjac_all.items():
    if info['categories']:
        primary_cat = info['categories'][0]
        c.execute("UPDATE articles SET research_area_zh = ? WHERE doi = ?", (primary_cat, doi))
        updated += 1

conn.commit()
print(f"Updated categories for {updated} articles")

# Show final distribution
c.execute("SELECT research_area_zh, COUNT(*) FROM articles GROUP BY research_area_zh ORDER BY COUNT(*) DESC")
print(f"\nFinal distribution:")
for row in c.fetchall():
    print(f"  {row[0]}: {row[1]}")

c.execute("SELECT COUNT(*) FROM articles")
total = c.fetchone()[0]
print(f"\nTotal articles: {total}")

conn.close()
print("\nDone!")
