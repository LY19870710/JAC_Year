# -*- coding: utf-8 -*-
"""
thjac_scraper.py - Fetch all articles from th-jac.com for each category tagid,
match with local JAC database by DOI, and produce a category mapping.
"""
import urllib.request
import json
import re
import sqlite3
import html

# Category mapping (tagid → Chinese name)
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
OUTPUT = r"D:\Claw\JAC_Year\thjac_mapping.json"

def fetch_papers(tagid, page=1):
    """Fetch all papers for a given tagid."""
    all_papers = []
    while True:
        url = f"{BASE}?tagid={tagid}&x-sveltekit-invalidated=00001&page={page}"
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0',
            'Referer': 'https://www.th-jac.com/hbr/paperlist',
        })
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
        
        nodes = data.get('nodes', [])
        if len(nodes) < 5:
            break
        
        inner = nodes[4].get('data', [])
        ref_map = inner[0]
        
        papers = inner[1] if ref_map.get('papers') == 1 else inner[ref_map['papers']]
        if len(papers) == 0:
            break
        
        # Extract paper data
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
            all_papers.append(p)
        
        pagination = inner[ref_map['pagination']] if ref_map.get('pagination') < len(inner) else None
        if pagination and pagination.get('totalPages', 0) <= page:
            break
        
        page += 1
        if page > 300:
            break
    
    return all_papers

def strip_html(text):
    """Remove HTML tags and decode entities."""
    if not text:
        return ''
    text = html.unescape(text)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

# Step 1: Fetch all articles from th-jac.com
print("Fetching articles from th-jac.com...")
thjac_articles = {}  # doi → set of category names

for tagid, cat_name in CATEGORIES.items():
    papers = fetch_papers(tagid)
    print(f"  {cat_name}: {len(papers)} articles")
    
    for p in papers:
        link = p.get('link', '')
        # Extract DOI from link like https://www.sciopen.com/article/10.26599/JAC.2026.9221315
        doi_match = re.search(r'(\d+\.\d+/JAC\.\d+\.\d+)', link)
        if doi_match:
            doi = doi_match.group(1)
            if doi not in thjac_articles:
                thjac_articles[doi] = set()
            thjac_articles[doi].add(cat_name)

print(f"\nTotal unique articles on th-jac.com: {len(thjac_articles)}")

# Step 2: Connect to local database
print("\nConnecting to local database...")
conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

# Get all articles with their DOIs
c.execute("SELECT id, title, doi, research_area_zh FROM articles")
local_articles = c.fetchall()

print(f"Local articles: {len(local_articles)}")

# Step 3: Cross-reference
mapping = {}  # local_id → category_name
unmatched = []

for local_id, title, doi, current_area in local_articles:
    if doi and doi in thjac_articles:
        cats = thjac_articles[doi]
        # For now, just use the first category (we'll handle multi-category later)
        cat_name = list(cats)[0]
        mapping[local_id] = cat_name
    else:
        unmatched.append(local_id)

print(f"\nMatched: {len(mapping)} articles")
print(f"Unmatched: {len(unmatched)} articles")

# Save the mapping
with open(OUTPUT, 'w', encoding='utf-8') as f:
    json.dump({
        "mapping": mapping,
        "unmatched": unmatched,
        "thjac_counts": {k: len(v) for k, v in thjac_articles.items()},
    }, f, ensure_ascii=False, indent=2)

conn.close()

print(f"\nMapping saved to {OUTPUT}")

# Show sample of the mapping
print("\nSample mapping (first 10):")
for local_id, cat_name in list(mapping.items())[:10]:
    print(f"  ID {local_id}: {cat_name}")
