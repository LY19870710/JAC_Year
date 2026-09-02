#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
classify.py — 研究方向分类器
将文章标题映射到 10 个研究方向（基于关键词规则）
"""

# 10 个研究方向定义（关键词列表，按优先级排序）
RESEARCH_AREAS = [
    {
        "id": 1,
        "name": "Ultra-High Temperature Ceramics (UHTC)",
        "name_zh": "超高温陶瓷",
        "keywords": [
            "ultra-high temperature", "uhtc", "hafnium", "zirconium diboride", "hfb2", "zrb2",
            "hfc", "zrc", "hfn", "tac", "tib2", "tac", "nbc",
            "ablation", "hypersonic", "reentry", "oxidation resistance at high temperature",
            "3000", "2000°c", "2500°c"
        ]
    },
    {
        "id": 2,
        "name": "Environmental & Thermal Barrier Coatings (EBC/TBC)",
        "name_zh": "环境/热障涂层",
        "keywords": [
            "thermal barrier", "environmental barrier", "tbc", "ebc",
            "cmas", "yttria-stabilized", "ysz", "rsz", "yag",
            "coating", "coatings", "spray", "sprayed", "deposition",
            "thermal cycling", "spallation", "bond coat", "top coat",
            "gas turbine", "turbine blade", "aero engine"
        ]
    },
    {
        "id": 3,
        "name": "Ceramic Matrix Composites (CMC)",
        "name_zh": "陶瓷基复合材料",
        "keywords": [
            "ceramic matrix composite", "cmc", "sic/sic", "c/sic", "cf/",
            "fiber reinforced", "fiber-reinforced", "woven", "braided",
            "interphase", "interface", "pyrolytic carbon", "pyc",
            "mechanical properties", "fracture toughness", "tensile strength",
            "thermal shock resistance", "mortise", "tenon"
        ]
    },
    {
        "id": 4,
        "name": "Dielectric, Piezoelectric & Ferroelectric Ceramics",
        "name_zh": "介电/压电/铁电陶瓷",
        "keywords": [
            "dielectric", "piezoelectric", "ferroelectric", "barium titanate", "batio3",
            "lead-free", "pzt", "pmn", "relaxor", "permittivity",
            "capacitor", "mlcc", "energy storage", "electrocaloric",
            "domain", "polarization", "coercive field"
        ]
    },
    {
        "id": 5,
        "name": "Functional Ceramics: Sensors, Catalysis & Energy",
        "name_zh": "功能陶瓷：传感/催化/能源",
        "keywords": [
            "sensor", "gas sensor", "voc", "humidity", "photocatalyst", "photocatalysis",
            "electrocatalysis", "oxygen evolution", "hydrogen evolution", "fuel cell",
            "solid oxide", "sofc", "lithium", "sodium", "battery", "anode", "cathode",
            "supercapacitor", "thermoelectric", "seebeck", "bismuth", "zinc oxide", "zno",
            "tio2", "cuo", "heterostructure"
        ]
    },
    {
        "id": 6,
        "name": "Sintering, Processing & Densification",
        "name_zh": "烧结、制备与致密化",
        "keywords": [
            "sintering", "spark plasma", "sps", "hot pressing", "densification",
            "microstructure", "grain growth", "grain boundary", "additive",
            "3d printing", "additive manufacturing", "gelcasting", "tape casting",
            "powder", "synthesis", "rapid", "flash sintering", "cold sintering",
            "dense", "porosity", "porous"
        ]
    },
    {
        "id": 7,
        "name": "Structural Ceramics: Mechanical & Tribological Properties",
        "name_zh": "结构陶瓷：力学与摩擦学",
        "keywords": [
            "hardness", "wear", "tribology", "friction", "scratch",
            "alumina", "al2o3", "silicon carbide", "sic", "silicon nitride", "si3n4",
            "zirconia", "zro2", "toughening", "crack", "indentation",
            "compressive strength", "flexural", "bending", "creep", "fatigue"
        ]
    },
    {
        "id": 8,
        "name": "High-Entropy Ceramics & Novel Compositions",
        "name_zh": "高熵陶瓷与新型成分",
        "keywords": [
            "high-entropy", "high entropy", "multi-principal", "multicomponent",
            "entropy", "solid solution", "medium-entropy",
            "max phase", "mn+1axn", "ti3alc2", "ti2alc",
            "novel composition", "new ceramic", "ternary", "quaternary"
        ]
    },
    {
        "id": 9,
        "name": "Bioceramics & Medical Applications",
        "name_zh": "生物陶瓷与医学应用",
        "keywords": [
            "bioceramic", "hydroxyapatite", "ha", "tricalcium phosphate", "tcp",
            "bone", "scaffold", "biocompatibility", "implant", "dental",
            "tissue engineering", "drug delivery", "antibacterial", "bioactive"
        ]
    },
    {
        "id": 10,
        "name": "Computational Modeling & Characterization",
        "name_zh": "计算模拟与表征",
        "keywords": [
            "molecular dynamics", "first-principles", "dft", "density functional",
            "finite element", "simulation", "modeling", "machine learning",
            "neural network", "artificial intelligence", "prediction",
            "xrd", "tem", "sem", "raman", "xps", "neutron diffraction",
            "in situ", "synchrotron"
        ]
    },
    {
        "id": 11,
        "name": "Joining, Brazing & Surface Engineering",
        "name_zh": "连接、钎焊与表面工程",
        "keywords": [
            "brazing", "braze", "joining", "wetting", "wettability",
            "reactive air", "active metal", "filler", "solder",
            "surface modification", "surface treatment", "surface engineering",
            "coating deposition", "cvd", "pvd", "ald"
        ]
    },
    {
        "id": 12,
        "name": "Optical, Luminescent & Transparent Ceramics",
        "name_zh": "光学、发光与透明陶瓷",
        "keywords": [
            "luminescence", "luminescent", "phosphor", "fluorescence",
            "transparent", "translucent", "optical", "scintillator",
            "laser", "upconversion", "photoluminescence", "emission",
            "rare earth", "doping", "dopant", "eu", "tb", "dy", "er", "yb",
            "van der waals", "2d material", "layered"
        ]
    },
]


def classify(title: str) -> dict:
    """
    将文章标题分类到研究方向。
    返回匹配的研究方向，未匹配返回 id=0 的 "Other"。
    """
    title_lower = title.lower()
    
    for area in RESEARCH_AREAS:
        for kw in area["keywords"]:
            if kw.lower() in title_lower:
                return {"id": area["id"], "name": area["name"], "name_zh": area["name_zh"]}
    
    return {"id": 0, "name": "Other", "name_zh": "其他"}


def classify_batch(articles: list) -> list:
    """批量分类，返回带 research_area 字段的文章列表"""
    result = []
    for a in articles:
        area = classify(a.get("title", ""))
        result.append({**a, "research_area_id": area["id"], "research_area": area["name"], "research_area_zh": area["name_zh"]})
    return result


def area_stats(articles: list) -> list:
    """统计各研究方向文章数量"""
    from collections import Counter
    counts = Counter(a.get("research_area", "Other") for a in articles)
    
    stats = []
    for area in RESEARCH_AREAS:
        count = counts.get(area["name"], 0)
        stats.append({"id": area["id"], "name": area["name"], "name_zh": area["name_zh"], "count": count})
    
    other = counts.get("Other", 0)
    if other:
        stats.append({"id": 0, "name": "Other", "name_zh": "其他", "count": other})
    
    return sorted(stats, key=lambda x: -x["count"])


if __name__ == "__main__":
    # 测试
    tests = [
        "Expanding the members of ultra-high temperature ceramics and their maximum service temperature exceeding 3000 °C",
        "An aluminum surface modification strategy for enhancing CMAS corrosion resistance of environmental barrier coatings",
        "Rapidly synthesized dense BaTa(O,N)3 ceramics with high permittivity",
        "A mortise–tenon joint inspired interface structure design for synergistically enhancing the mechanical properties",
        "CuO-decorated bismuth subcarbonate p–n heterostructured micro-flowers for high-selectivity VOC gas sensor arrays",
        "Structural evolution-driven enhancement of thermoelectric performance in Bi–S–Se solid solutions",
    ]
    for t in tests:
        area = classify(t)
        print(f"[{area['id']}] {area['name_zh']}")
        print(f"  {t[:70]}")
        print()
