#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
classify.py — 研究方向分类器（同步 th-jac.com 20 个分类）
将文章标题映射到 20 个研究方向（基于关键词规则）
"""

# 20 个研究方向定义（与 https://www.th-jac.com/hbr/paperlist 一致）
# 按优先级排序：具体的先匹配，宽泛的后匹配
RESEARCH_AREAS = [
    {
        "id": 1,
        "name": "High-Entropy Ceramics & Processing Technology",
        "name_zh": "高熵陶瓷的制备及工艺技术",
        "keywords": [
            "high-entropy ceramic", "high entropy ceramic", "high-entropy oxide",
            "high-entropy carbide", "high-entropy nitride", "high-entropy boride",
            "high-entropy silicide", "high entropy alloy", "entropy engineering",
            "compositionally complex ceramic", "multi-principal element",
            "high-entropy composite", "entropy-stabilized", "entropy stabilised",
            "high-entropy (", "high entropy (", "high-entropy(",
            "high-entropy-", "high entropy "
        ]
    },
    {
        "id": 2,
        "name": "Room-Temperature, High-Temperature & UHT Structural Ceramics",
        "name_zh": "室温、高温及超高温结构陶瓷",
        "keywords": [
            "ultra-high temperature", "ultrahigh temperature",
            "thermal protection", "ablation resistance", "ablation resistant",
            "hypersonic", "re-entry", "reentry",
            "structural application", "structural ceramic",
            "high-temperature strength", "creep resistance",
            "thermal shock resistance", "thermal shock",
            "fracture toughness", "fracture strength",
            "hfb2", "zrb2", "hfc", "zrc", "hfn", "tac",
            "uhtc", "ultra-high temperature ceramic"
        ]
    },
    {
        "id": 3,
        "name": "Thermal & Environmental Barrier Coatings",
        "name_zh": "热障涂层、环境障涂层及其他保护性涂层",
        "keywords": [
            "thermal barrier coating", "tbc", "ebc",
            "environmental barrier", "thermal barrier",
            "cmas resistance", "cmas corrosion",
            "ysz coating", "yttria-stabilized zirconia",
            "protective coating", "anti-oxidation coating",
            "thermal spray coating", "plasma spray coating",
            "turbine blade coating", "aero engine coating",
            "bond coat", "top coat", "thermal cycling",
            "coating deposition", "coating for"
        ]
    },
    {
        "id": 4,
        "name": "MAX Phase, MAB Phase & 2D Derivatives",
        "name_zh": "MAX相、MAB相及其二维衍生物",
        "keywords": [
            "mxene", "max phase", "mab phase",
            "ti3alc2", "ti2alc", "ti3c2", "ti2c",
            "v2alc", "nb2alc", "mo2alc",
            "mo2tic2", "v2c", "nb2c", "mo2c",
            "maxene", "mbene", "2d carbide",
            "two-dimensional carbide", "layered carbide",
            "delaminated", "exfoliated mxene",
            "mn+1axn", "mn+1cxn"
        ]
    },
    {
        "id": 5,
        "name": "Microwave Absorbing & Transmitting Ceramics",
        "name_zh": "吸波陶瓷与透波陶瓷",
        "keywords": [
            "microwave absorption", "electromagnetic absorption",
            "microwave absorber", "em absorber",
            "electromagnetic shielding", "emi shielding",
            "radar cross section", "rcs reduction",
            "stealth material", "absorbing material",
            "absorption bandwidth", "effective absorption",
            "reflection loss", "rlmin",
            "microwave dielectric", "loss tangent",
            "permittivity", "permeability"
        ]
    },
    {
        "id": 6,
        "name": "Transparent & Luminescent Ceramics",
        "name_zh": "透明陶瓷与发光陶瓷",
        "keywords": [
            "transparent ceramic", "optical ceramic",
            "luminescent ceramic", "luminescence",
            "phosphor", "fluorescence", "fluorescent",
            "scintillator", "scintillation",
            "laser ceramic", "solid-state laser",
            "upconversion", "downconversion",
            "photoluminescence", "photoluminescent",
            "transparent alumina", "transparent alon",
            "transparent yag", "transparent spinel",
            "transparent ceramic laser",
            "emission", "rare earth doped",
            "eu-doped", "eu3+", "tb3+", "er3+", "yb3+",
            "phosphor ceramic", "led phosphor",
            "quantum dot"
        ]
    },
    {
        "id": 7,
        "name": "Porous Ceramics & Inorganic Membranes",
        "name_zh": "多孔陶瓷与多孔无机膜",
        "keywords": [
            "porous ceramic", "porous membrane",
            "ceramic membrane", "inorganic membrane",
            "gas separation", "water treatment",
            "hierarchical porous", "porous structure",
            "filtration membrane", "separation membrane",
            "aerogel", "hollow fiber membrane",
            "membrane reactor", "membrane distillation"
        ]
    },
    {
        "id": 8,
        "name": "Dielectric, Piezoelectric & Ferroelectric Ceramics",
        "name_zh": "介电、压电、铁电及功能化耦合材料",
        "keywords": [
            "dielectric ceramic", "dielectric material",
            "piezoelectric ceramic", "piezoelectric material",
            "ferroelectric ceramic", "ferroelectric material",
            "barium titanate", "batio3",
            "lead-free piezoelectric", "pzt",
            "pmn-pt", "relaxor ferroelectric",
            "energy storage capacitor", "multilayer ceramic capacitor",
            "mlcc", "electrocaloric",
            "positive temperature coefficient", "ptc",
            "negative temperature coefficient", "ntc",
            "varactor", "tunable capacitor",
            "domain engineering", "domain structure",
            "coercive field", "polarization switching"
        ]
    },
    {
        "id": 9,
        "name": "Inorganic Nanofunctional Materials",
        "name_zh": "无机纳米功能材料",
        "keywords": [
            "nanofunctional", "nano-functional",
            "nanowire", "nanotube", "nanofiber",
            "nanoparticle synthesis", "nanocomposite",
            "nanocrystal", "nanocrystalline",
            "nanostructured", "nanostructure",
            "low-dimensional", "0d material", "1d material",
            "quantum dot", "quantum size",
            "nanosheet", "nanobelt", "nanoribbon"
        ]
    },
    {
        "id": 10,
        "name": "Energy Conversion & Storage Materials",
        "name_zh": "能源转换与能源存储材料",
        "keywords": [
            "battery", "lithium-ion", "sodium-ion", "solid-state battery",
            "fuel cell", "sofc", "solid oxide fuel cell",
            "supercapacitor", "supercapacitor",
            "solar cell", "photovoltaic", "perovskite solar",
            "thermoelectric", "seebeck",
            "energy storage", "energy conversion",
            "hydrogen storage", "hydrogen production",
            "oxygen evolution", "hydrogen evolution",
            "electrocatalysis", "electrocatalyst",
            "photocatalysis", "photocatalyst",
            "water splitting", "co2 reduction",
            "ion conductor", "ionic conductivity",
            "solid electrolyte", "solid state electrolyte",
            "cathode material", "anode material",
            "catalyst for", "catalysis for"
        ]
    },
    {
        "id": 11,
        "name": "Multiferroic, Magnetic & Superconducting Materials",
        "name_zh": "多铁材料、磁性材料及超导材料",
        "keywords": [
            "multiferroic", "magnetic material",
            "ferrimagnetic", "ferromagnetic",
            "superconducting", "superconductor",
            "ybco", "bscco", "mgb2",
            "magnetoelectric", "magneto-optical",
            "magnetic storage", "spintronics",
            "soft ferrite", "hard ferrite",
            "exchange coupling", "magnetic domain",
            "magnetic ceramic", "magnetic composite"
        ]
    },
    {
        "id": 12,
        "name": "Sensitive Materials & Applications",
        "name_zh": "敏感材料及其应用",
        "keywords": [
            "gas sensor", "humidity sensor",
            "pressure sensor", "strain sensor",
            "temperature sensor", "biosensor",
            "chemical sensor", "chemiresistive",
            "sensing material", "sensing performance",
            "sensitivity", "selectivity",
            "response time", "recovery time",
            "detector", "sensor based"
        ]
    },
    {
        "id": 13,
        "name": "Environmental Purification & Remediation Materials",
        "name_zh": "环境净化与环境修复材料",
        "keywords": [
            "environmental remediation", "environmental purification",
            "water treatment", "wastewater treatment",
            "air purification", "pollution control",
            "heavy metal removal", "organic pollutant",
            "dye degradation", "photocatalytic degradation",
            "adsorption", "adsorbent",
            "co2 capture", "carbon capture",
            "pollutant removal", "pollutant degradation"
        ]
    },
    {
        "id": 14,
        "name": "Glass, Glass-Ceramics & Geopolymer Ceramics",
        "name_zh": "玻璃、玻璃陶瓷及地质聚合物陶瓷",
        "keywords": [
            "glass-ceramic", "glass ceramic",
            "crystallization of glass", "vitrification",
            "metallic glass", "amorphous",
            "geopolymer", "alkali-activated",
            "aluminosilicate", "sintering glass",
            "glass powder", "glass transition",
            "borosilicate glass", "phosphate glass",
            "glaze", "ceramic glaze"
        ]
    },
    {
        "id": 15,
        "name": "Bioceramics",
        "name_zh": "生物陶瓷",
        "keywords": [
            "bioceramic", "biomedical ceramic",
            "hydroxyapatite", "hap",
            "tricalcium phosphate", "tcp",
            "bioglass", "bioactive glass",
            "bone regeneration", "bone repair",
            "scaffold", "tissue engineering",
            "implant material", "dental ceramic",
            "biocompatibility", "antibacterial",
            "drug delivery", "wound healing"
        ]
    },
    {
        "id": 16,
        "name": "Additive Manufacturing & 3D/4D Printing",
        "name_zh": "增材制造及3D/4D打印技术",
        "keywords": [
            "3d printing", "3d-printed", "3d printer",
            "additive manufacturing", "am ",
            "stereolithography", "digital light processing",
            "direct ink writing", "diw",
            "selective laser sintering", "sls",
            "fused deposition modeling", "fdm",
            "vat photopolymerization", "two-photon polymerization",
            "robocasting", "printable ceramic",
            "printed ceramic", "4d printing"
        ]
    },
    {
        "id": 17,
        "name": "Processing Technology (Powder, Forming, Sintering, Joining)",
        "name_zh": "工艺技术 (粉体、成型、烧结、连接等)",
        "keywords": [
            "sintering process", "sintering behavior",
            "sintering mechanism", "sintering kinetics",
            "densification", "densification behavior",
            "grain growth", "grain boundary",
            "powder synthesis", "powder processing",
            "forming process", "shaping process",
            "tape casting", "gelcasting", "slip casting",
            "injection molding", "binder jetting",
            "joining", "brazing", "welding",
            "diffusion bonding", "reactive bonding",
            "heat treatment", "annealing",
            "processing parameter", "processing condition"
        ]
    },
    {
        "id": 18,
        "name": "Performance Testing & Evaluation",
        "name_zh": "性能测试与评价技术",
        "keywords": [
            "mechanical testing", "mechanical properties",
            "hardness test", "tensile test",
            "compressive test", "bend test",
            "fracture test", "fatigue test",
            "creep test", "wear test",
            "non-destructive testing", "ndt",
            "quality control", "reliability",
            "failure analysis", "fractography",
            "standard test", "test method"
        ]
    },
    {
        "id": 19,
        "name": "Computational Modeling & Simulation",
        "name_zh": "材料计算与模拟",
        "keywords": [
            "molecular dynamics", "md simulation",
            "first-principles", "dft calculation",
            "density functional theory", "dft",
            "finite element", "fea",
            "machine learning", "neural network",
            "artificial intelligence", "deep learning",
            "high-throughput", "screening",
            "computational modeling", "computational simulation",
            "ab initio", "ab initio calculation",
            "monte carlo", "phase field",
            "crystal structure prediction",
            "data-driven", "materials informatics"
        ]
    },
    {
        "id": 20,
        "name": "Excellent Chinese Review Papers",
        "name_zh": "优秀中文综述论文推荐",
        "keywords": [
            "review", "综述", "progress in",
            "advance in", "trend in",
            "overview of", "summary of",
            "perspective", "commentary"
        ]
    },
]


def classify(title: str, abstract: str = "", keywords: list = None) -> dict:
    """
    将文章标题/摘要/关键词分类到研究方向。
    返回匹配的研究方向，未匹配返回 id=0 的 "Other"。
    """
    text = (title + " " + abstract).lower()
    if keywords:
        text += " " + " ".join(keywords).lower()

    for area in RESEARCH_AREAS:
        for kw in area["keywords"]:
            if kw.lower() in text:
                return {"id": area["id"], "name": area["name"], "name_zh": area["name_zh"]}

    return {"id": 0, "name": "Other", "name_zh": "其他"}


def classify_batch(articles: list) -> list:
    """批量分类，返回带 research_area 字段的文章列表"""
    result = []
    for a in articles:
        area = classify(a.get("title", ""), a.get("abstract", ""), a.get("keywords"))
        result.append({**a, "research_area_id": area["id"], "research_area": area["name"], "research_area_zh": area["name_zh"]})
    return result


def area_stats(articles: list) -> list:
    """统计各研究方向文章数量"""
    from collections import Counter
    counts = Counter(a.get("research_area_zh", "其他") for a in articles)

    stats = []
    for area in RESEARCH_AREAS:
        count = counts.get(area["name_zh"], 0)
        stats.append({"id": area["id"], "name": area["name"], "name_zh": area["name_zh"], "count": count})

    other = counts.get("其他", 0)
    if other:
        stats.append({"id": 0, "name": "Other", "name_zh": "其他", "count": other})

    return sorted(stats, key=lambda x: -x["count"])


if __name__ == "__main__":
    # 测试
    tests = [
        "High-entropy carbide ceramics with enhanced toughness",
        "Ablation resistance of UHTC ceramics at 3000°C",
        "Thermal barrier coatings for gas turbine blades",
        "MXene-derived 2D materials for energy storage",
        "Microwave absorption of carbon nanofibers",
        "Transparent ceramics for solid-state lighting",
        "Porous ceramic membranes for water treatment",
        "Dielectric properties of BaTiO3-based ceramics",
        "Nanofunctional ZnO sensors for gas detection",
        "Solid electrolyte for lithium batteries",
        "Multiferroic BiFeO3 thin films",
        "Bioceramic scaffolds for bone tissue engineering",
        "3D printing of complex ceramic structures",
        "Spark plasma sintering of nanostructured ceramics",
        "First-principles calculation of ceramic properties",
    ]
    for t in tests:
        area = classify(t)
        print(f"[{area['id']:2d}] {area['name_zh']}")
        print(f"  {t[:70]}")

