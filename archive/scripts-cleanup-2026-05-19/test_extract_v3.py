#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""机构提取优化 v0.3.0 - 改进版"""
import re

def extract_institution_v3(aff_item: str) -> str:
    """
    从单条机构原文中提取机构名。
    规则：只保留地址前面的那1级（城市+邮编之前的最后一个有意义的部分）
    """
    original = aff_item.strip()
    
    # 去掉开头的数字编号
    cleaned = re.sub(r'^[\d†*]+', '', original).strip()
    if not cleaned:
        return ''
    
    # 跳过噪音行
    if 'contributed equally' in cleaned.lower() or cleaned.startswith('†') or cleaned.startswith('*'):
        return ''
    
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
    
    # 城市名列表（常见的）
    CITIES = {
        'beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'wuhan',
        'xi\'an', 'xian', 'hangzhou', 'nanjing', 'harbin', 'jinan', 'changsha',
        'daegu', 'seoul', 'tokyo', 'osaka', 'bangkok', 'singapore', 'new york',
        'los angeles', 'london', 'paris', 'berlin', 'moscow', 'toronto',
        'sydney', 'melbourne', 'delhi', 'mumbai', 'bangkok', 'bangkok',
    }
    
    def is_country(p: str) -> bool:
        return p.lower().strip() in COUNTRIES
    
    def is_city(p: str) -> bool:
        """检查是否是城市名"""
        return p.lower().strip() in CITIES
    
    def is_city_zip(p: str) -> bool:
        """检查是否是城市+邮编格式（如 "Kaifeng 475004"）"""
        return bool(re.search(r'\d{4,}', p))
    
    def is_noise(p: str) -> bool:
        """检查是否是噪音（如 "Ltd.", "Inc.", 单个字母等）"""
        p_lower = p.lower().strip()
        # 太短的通常是噪音
        if len(p_lower) < 3:
            return True
        # 单独的公司后缀（不是完整公司名的一部分）
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


# 测试
if __name__ == '__main__':
    test_cases = [
        ("1Henan Key Laboratory of High-Efficiency Energy Conversion Science and Technology, Henan International Joint Laboratory of New Energy Materials and Devices, School of Physics and Electronics, Henan University, Kaifeng 475004, China", "Henan University"),
        ("2School of Information and Artificial Intelligence, Anhui Agricultural University, Hefei 230036, China", "Anhui Agricultural University"),
        ("3School of Intelligent Manufacturing, Wenzhou Polytechnic, Wenzhou 325035, China", "Wenzhou Polytechnic"),
        ("4State Grid Fuzhou Electric Power Supply Company, Fuzhou 350009, China", "State Grid Fuzhou Electric Power Supply Company"),
        ("5School of Measurement and Communication Engineering, Harbin University of Science and Technology, Harbin 150", "Harbin University of Science and Technology"),
        ("1Regional Leading Research Center for Smart Energy Systems, Kyungpook National University, Daegu 41566, Republic of Korea", "Kyungpook National University"),
        ("4AECC Shenyang Liming Aero Engine Co., Ltd., Shenyang 110043, China", "AECC Shenyang Liming Aero Engine Co., Ltd."),
        ("School of Materials, Shenzhen Campus of Sun Yat-sen University, Shenzhen 518107, China", "Shenzhen Campus of Sun Yat-sen University"),
    ]
    
    for tc, expected in test_cases:
        result = extract_institution_v3(tc)
        status = "✓" if result == expected else "✗"
        print(f"{status} {result}")
        if result != expected:
            print(f"  Expected: {expected}")
