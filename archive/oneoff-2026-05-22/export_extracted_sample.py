#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""导出机构提取对比表"""
import sqlite3, csv, sys, os, re
sys.stdout.reconfigure(encoding='utf-8')

def extract_institution(aff_item: str) -> str:
    """提取机构名（简化版，只返回名称）"""
    original = aff_item.strip()
    cleaned = re.sub(r'^[\d†*]+', '', original).strip()
    if not cleaned or 'contributed equally' in cleaned.lower():
        return ''
    
    parts = [p.strip() for p in cleaned.split(',')]
    COUNTRIES = {
        'china', 'usa', 'u.s.a.', 'uk', 'japan', 'korea', 'germany', 'france',
        'republic of korea', 'south korea', 'australia', 'canada', 'india',
        'italy', 'spain', 'russia', 'netherlands', 'brazil', 'mexico',
        'thailand', 'singapore', 'malaysia', 'vietnam', 'indonesia',
        'philippines', 'pakistan', 'bangladesh', 'sri lanka', 'iran',
        'turkey', 'egypt', 'south africa', 'nigeria', 'kenya',
        'chile', 'argentina', 'colombia', 'peru', 'venezuela',
        'new zealand', 'austria', 'belgium', 'denmark', 'finland',
        'greece', 'ireland', 'norway', 'poland', 'portugal',
        'sweden', 'switzerland', 'czech republic', 'hungary', 'romania',
        'ukraine', 'belarus', 'serbia', 'croatia', 'slovenia',
        'estonia', 'latvia', 'lithuania', 'iceland', 'luxembourg',
    }
    CITIES = {
        'beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'wuhan',
        'xi\'an', 'xian', 'hangzhou', 'nanjing', 'harbin', 'jinan', 'changsha',
        'daegu', 'seoul', 'tokyo', 'osaka', 'bangkok', 'singapore', 'new york',
        'los angeles', 'london', 'paris', 'berlin', 'moscow', 'toronto',
        'sydney', 'melbourne', 'delhi', 'mumbai',
    }
    
    def is_country(p: str) -> bool:
        return p.lower().strip() in COUNTRIES
    
    def is_city(p: str) -> bool:
        return p.lower().strip() in CITIES
    
    def is_city_zip(p: str) -> bool:
        return bool(re.search(r'\d{4,}', p))
    
    def is_noise(p: str) -> bool:
        p_lower = p.lower().strip()
        if len(p_lower) < 3:
            return True
        if p_lower in ('ltd.', 'ltd', 'inc.', 'inc', 'co.', 'co', 'corp.', 'corp', 'gmbh', 'ag', 'sa', 'bv'):
            return True
        return False
    
    # 从后往前找第一个非跳过的部分
    for i in range(len(parts) - 1, -1, -1):
        p = parts[i].strip()
        if not p:
            continue
        if is_country(p):
            continue
        if is_city(p):
            continue
        if is_city_zip(p):
            continue
        if is_noise(p):
            # 如果是噪音（如 "Ltd."），尝试和前一个 part 合并
            if i > 0:
                prev = parts[i-1].strip()
                if prev and not is_noise(prev):
                    return f"{prev}, {p}"
            continue
        # 找到了！
        return p
    
    # 如果没找到，返回第一个非空、非噪音部分
    for p in parts:
        p_clean = p.strip()
        if p_clean and not is_noise(p_clean):
            return p_clean
    
    return ''

conn = sqlite3.connect('jac_articles.db')
cur = conn.cursor()
cur.execute("SELECT doi, affiliations FROM articles WHERE affiliations != '' ORDER BY id LIMIT 50")
rows = cur.fetchall()
conn.close()

outpath = 'E:/Claw/JAC_Year/scripts/affiliations_extracted_sample.csv'
with open(outpath, 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['doi', 'affiliations_raw', 'extracted_institutions'])
    for doi, aff_raw in rows:
        # 提取所有机构
        institutions = []
        seen = set()
        for aff_item in aff_raw.split(';'):
            inst = extract_institution(aff_item)
            if inst and inst not in seen:
                institutions.append(inst)
                seen.add(inst)
        writer.writerow([doi, aff_raw, '; '.join(institutions)])

print(f'Exported sample to {outpath}')
