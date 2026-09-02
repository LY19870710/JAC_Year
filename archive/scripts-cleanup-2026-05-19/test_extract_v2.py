#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
机构提取优化 v0.3.0
规则：只保留地址前面的那1级（城市+邮编之前的最后一个有意义的部分）
"""
import re

def extract_institution_v2(aff_item: str) -> tuple[str, str]:
    """
    从单条机构原文中提取机构名。
    返回 (short_name, original) 元组。
    
    规则：
    1. 去掉开头的数字编号（如 "1", "2", "†"）
    2. 跳过噪音行（"contributed equally"）
    3. 按逗号分隔，从后往前找：
       - 跳过国家名（China, USA, etc）
       - 跳过城市+邮编（如 "Kaifeng 475004"）
       - 第一个非跳过的部分就是机构名
    """
    original = aff_item.strip()
    
    # 去掉开头的数字编号
    cleaned = re.sub(r'^[\d†*]+', '', original).strip()
    if not cleaned:
        return ('', original)
    
    # 跳过噪音行
    if 'contributed equally' in cleaned.lower() or cleaned.startswith('†') or cleaned.startswith('*'):
        return ('', original)
    
    # 按逗号分隔
    parts = [p.strip() for p in cleaned.split(',')]
    
    # 国家名列表
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
    
    def is_country(p: str) -> bool:
        return p.lower().strip() in COUNTRIES
    
    def is_city_zip(p: str) -> bool:
        """检查是否是城市+邮编格式（如 "Kaifeng 475004"）"""
        # 包含 4+ 位数字的通常是邮编
        return bool(re.search(r'\d{4,}', p))
    
    # 从后往前找第一个非跳过的部分
    for p in reversed(parts):
        p_clean = p.strip()
        if not p_clean:
            continue
        if is_country(p_clean):
            continue
        if is_city_zip(p_clean):
            continue
        # 找到了！
        return (p_clean, original)
    
    # 如果没找到，返回第一个非空部分
    for p in parts:
        if p.strip():
            return (p.strip(), original)
    
    return ('', original)


# 测试
if __name__ == '__main__':
    test_cases = [
        "1Henan Key Laboratory of High-Efficiency Energy Conversion Science and Technology, Henan International Joint Laboratory of New Energy Materials and Devices, School of Physics and Electronics, Henan University, Kaifeng 475004, China",
        "2School of Information and Artificial Intelligence, Anhui Agricultural University, Hefei 230036, China",
        "3School of Intelligent Manufacturing, Wenzhou Polytechnic, Wenzhou 325035, China",
        "4State Grid Fuzhou Electric Power Supply Company, Fuzhou 350009, China",
        "5School of Measurement and Communication Engineering, Harbin University of Science and Technology, Harbin 150",
        "Science and Technology on Advanced Ceramic Fibers and Composites Laboratory, College of Aerospace Science and Engineering, National University of Defense Technology, Changsha 410073, China",
        "Key Laboratory of Functional Inorganic Material Chemistry, Ministry of Education, School of Chemistry and Materials Science, Heilongjiang University, Harbin 150080, China",
    ]
    
    for tc in test_cases:
        short, orig = extract_institution_v2(tc)
        print(f"✓ {short}")
