"""
JAC 文章研究方向自动分类脚本
根据标题关键词匹配，自动为 204 篇文章分配分类
"""
import sqlite3, re, sys
sys.stdout.reconfigure(encoding='utf-8')

DB_PATH = r'E:\Claw\JAC_Year\jac_articles.db'

# ===== 分类关键词规则 =====
# 优先级：数字越小优先级越高，先匹配到就停止
CLASSIFICATION_RULES = [
    # 1. 增材制造
    (1, '增材制造及 3D/4D 打印技术', [
        r'3d\s*print', r'additive\s*manufactur', r'stereolithography', r'selective\s*laser',
        r'direct\s*ink\s*writing', r'bioprint', r'vat\s*photopolymer', r'3d打印',
        r'增材制造', r'3D打印', r'快速成型',
    ]),
    # 2. MAX相 / MAB相 / MXene / 二维材料
    (2, 'MAX 相、MAB 相及其二维衍生物', [
        r'\bMAX\b', r'\bMAB\b', r'MXene', r'\bMX\b', r'V\s*2\s*C\b', r'Ti\s*3\s*C\s*T',
        r'maxene', r'mxene', r'two[\s-]*dimensional.*ceramic', r'2D.*ceramic',
        r'layered\s*carbide', r'layered\s*nitride', r'\bTi\s*3\s*C', r'Nb\s*2\s*C',
        r'Mo\s*2\s*C', r'Cr\s*2\s*C',
    ]),
    # 2b. EMI 屏蔽（吸波/透波的另一面）
    (2, '吸波陶瓷与透波陶瓷', [
        r'electromagnetic\s*interference', r'EMI\s*shield', r'EMI\s*absor',
        r'electromagnetic\s*shield', r'EMI\s*suppression',
        r'SiBCN', r'Cf/HC',
    ]),
    # 3. 多铁 / 磁性 / 超导
    (3, '多铁材料、磁性材料及超导材料', [
        r'multiferroic', r'magneto', r'ferromagnet', r'ferrimagnet', r'superconduct',
        r'magnetocaloric', r'magnetostrict', r'magnetic\s*ceramic', r'spin\s*orbit',
        r'piezomagnet', r'矫顽', r'磁热', r'超导', r'多铁',
        r'CoFe2O4', r'NiFe2O4', r'Fe3O4.*magnetic', r'magnet.*nanoparticle',
    ]),
    # 4. 敏感材料 / 传感器
    (4, '敏感材料及其应用', [
        r'sensor', r'sensing', r'detect', r'gas\s*sensor', r'humidity\s*sensor',
        r'strain\s*sensor', r'pressure\s*sensor', r'biosensor', r'electrochemical\s*sensor',
        r'piezoresist', r'NTC', r'PTC', r'varistor', r'thermistor',
        r'传感', r'敏感', r'探测器', r'检测',
    ]),
    # 5. 透明陶瓷 / 发光陶瓷
    (5, '透明陶瓷与发光陶瓷', [
        r'transparent\s*ceramic', r'translucent\s*ceramic', r'luminescent',
        r'phosphor', r'photoluminescent', r'electroluminescent', r'scintillator',
        r'glow', r'up[\s-]*conversion', r'down[\s-]*conversion', r'persistent\s*lumin',
        r'夜光', r'透明陶瓷', r'发光', r'荧光', r'磷光',
        r'Nd:YAG', r'YAG.*transparent', r'Lu2O3.*transparent',
        r'infrared\s*emiss', r'infrared\s*reflect', r'emissivity',
        r'color\s*converter', r'radiance', r'x[\s-]*ray\s*imaging',
        r'LuAG\b', r'sapphire.*color', r'thermophotovoltaic',
        r'LaAlO3', r'CrNbO4', r'Vis[\s-]*NIR.*emiss', r'dual[\s-]*emiss',
        r'Mn[\s-]*dop', r'heterovalent.*emiss',
        # 分散剂 -> 工艺技术（移到这里避免干扰）
        r'dispersant', r'dispersion',
    ]),
    # 6. 吸波 / 透波（电磁屏蔽/隐身）
    (6, '吸波陶瓷与透波陶瓷', [
        r'microwave\s*absor', r'electromagnetic\s*absor', r'stealth', r'radar\s*absor',
        r'EMI\s*shield', r'electromagnetic\s*shield', r'wave[\s-]*absor',
        r'broadband\s*absor', r'multiband\s*absor', r'reflectivity',
        r'吸波', r'透波', r'电磁屏蔽', r'隐身', r'雷达吸收',
    ]),
    # 7. 热障涂层 / 环境障涂层 / 超高温结构
    (7, '热障涂层、环境障涂层及其他保护性涂层', [
        r'thermal\s*barrier', r'TBC\b', r'environmental\s*barrier', r'EBC\b',
        r'protective\s*coat', r'thermal\s*shock.*coat', r'oxidation\s*resistant',
        r'corrosion\s*resistant.*coat', r'abradable\s*coat', r'thermal\s*insulat',
        r'sliding\s*wear.*coat', r'wear\s*resistant.*coat', r'abrasion\s*coat',
        r'热障', r'环境障', r'保护涂层', r'耐热涂层', r'耐腐蚀涂层',
        r'ablation', r'烧蚀', r'CMAS', r'Yb4Hf3O12', r'HfC[\s-]*HfO',
        r'ZrB2', r'HfB2', r'TaC\b', r'hafnium\s*carbide', r'tantalum\s*carbide',
        r'thermal\s*protect', r'thermal\s*shield', r'heat\s*shield',
        r'ultra[\s-]*high\s*temperature', r'super[\s-]*high\s*temp',
        r'3000.*melting', r'melting\s*temperature.*barrier',
        r'hydrogen\s*permeation', r'permeation\s*resist',
    ]),
    # 8. 多孔陶瓷 / 无机膜
    (8, '多孔陶瓷与多孔无机膜', [
        r'porous\s*ceramic', r'porous\s*alumina', r'porous\s*silicon', r'membrane',
        r'filter', r'separation.*membrane', r'zeolite\s*membrane', r'ceramic\s*membrane',
        r'microfiltration', r'ultrafiltration', r'gas\s*separat.*membrane',
        r'honeycomb', r'cellular\s*ceramic', r'DPF', r'GPF',
        r'多孔陶瓷', r'过滤陶瓷', r'陶瓷膜', r'蜂窝陶瓷',
    ]),
    # 9. 能源存储 / 转换
    (9, '能源转换与能源存储材料', [
        r'batter', r'supercapacitor', r'fuel\s*cell', r'electrolyzer', r'hydrogen\s*evol',
        r'water\s*split', r'CO2\s*reduc', r'photocatalyst', r'electrocatalyst',
        r'sodium[\s-]*ion', r'potassium[\s-]*ion', r'zinc[\s-]*ion', r'magnesium[\s-]*ion',
        r'Li[\s-]*ion', r'Li\s*2\s*S', r'anode.*material', r'cathode.*material',
        r'LIB\b', r'SIB\b', r'PIB\b', r'ZIB\b', r'MIB\b',
        r'oxygen\s*reduc', r'ORR\b', r'OER\b', r'HER\b',
        r'锂离子', r'钠离子', r'钾离子', r'锌离子', r'电池',
        r'超级电容', r'燃料电池', r'光催化', r'电催化', r'制氢',
        r'hydrogel.*ceramic', r'energy\s*stor', r'energy\s*conver',
        r'NASICON', r'nasicon', r'oxygen\s*electrode', r'steam\s*electrode',
        r'electrolysis', r'water\s*electrolys', r'MIL-100',
        r'MOF.*electrode', r'MOF.*catalyst', r'钙钛矿.*电极',
        r'Mg2\s*\+.*LuAG', r'LuAG.*electrode',
        r'phosphate.*near', r'near[\s-]*infrared.*phos', r'double\s*phosphate',
    ]),
    # 10. 介电 / 压电 / 铁电
    (10, '介电、压电、铁电及功能化耦合材料', [
        r'dielectric', r'piezoelectric', r'ferroelectric', r'antiferroelectric',
        r'pyroelectric', r'electrostrict', r'magnetoelectric', r'flexoelectric',
        r'relaxor', r'BaTiO3', r'BiFeO3', r'KNN\b', r'NaNbO3', r'Bi4Ti3O12',
        r'lead[\s-]*free.*piezo', r'lead[\s-]*free.*ferro', r'PbTiO3',
        r'介电', r'压电', r'铁电', r'热释电',
        r'微波介电', r'microwave\s*dielectric', r'Q\s*factor', r'品质因子',
        r'储能密度', r'energy\s*stor.*dielectric',
        r'piezoceramic', r'electrobending', r'electrocaloric', r'BiAlO3',
        r'Bi1/2Na1/2TiO3', r'Na0.5Bi0.5TiO3', r'BaZr', r'SrZrO3', r'K0.5Na0.5',
        r'permittivity', r'high[\s-]*permittiv', r'low[\s-]*loss.*dielectric',
        # 微波介电补充
        r'Bi2(MgTi)O6', r'CaTiO3.*dielectric', r'Ba5Nb4O15', r'temperature\s*stabil',
    ]),
    # 11. 无机纳米功能材料
    (11, '无机纳米功能材料', [
        r'nanoparticle', r'nanowire', r'nanotube', r'nanofiber', r'nanosheet',
        r'nanostruct', r'quantum\s*dot', r'nanocluster', r'nanocrystal',
        r'2D\s*material.*not.*ceramic', r'graphene', r'black\s*phosphor',
        r'nanomesh', r'nano[\s-]*hierarch', r'nanorod', r'nanoplate',
        r'纳米颗粒', r'纳米线', r'纳米管', r'纳米片', r'纳米结构',
        r'MOF[\s-]*derived', r'MOF[\s-]*based', r'MIL[\s-]',
        # 异价态/双发射
        r'heterovalent', r'dual[\s-]*emiss.*Mn',
        # 界面工程
        r'interface[\s-]*engineer',
    ]),
    # 12. 高熵陶瓷
    (12, '高熵陶瓷的制备及工艺技术', [
        r'high[\s-]*entropy.*ceramic', r'high[\s-]*entropy.*boride',
        r'high[\s-]*entropy.*carbide', r'high[\s-]*entropy.*nitride',
        r'high[\s-]*entropy.*silicide', r'high[\s-]*entropy.*oxide',
        r'high[\s-]*entropy.*fluoride', r'high[\s-]*entropy.*phosphide',
        r'HE\s*ceramic', r'高熵陶瓷', r'高熵陶瓷',
        r'high[\s-]*entropy.*MAX', r'high[\s-]*entropy.*refractory',
        r'high[\s-]*entropy.*NASICON', r'high[\s-]*entropy.*phosph',
        r'high[\s-]*entropy.*water', r'high[\s-]*entropy.*oxygen',
        # 工艺技术：烧结/裂纹控制/分散
        r'crack[\s-]*free', r'crack[\s-]*free.*ceramic', r'colossal\s*crack',
        r'solid[\s-]*state\s*diffusion', r'diffusion.*ceramic',
        r'creep.*ceramic', r'creep.*sinter',
        r'self[\s-]*consumption.*SiO2', r'SiO2.*phase\s*transition',
        r'dispersant', r'dispersion.*ceramic',
        # 界面工程
        r'interface[\s-]*engineer', r'interface.*durab',
    ]),
    # 13. 生物陶瓷
    (13, '生物陶瓷', [
        r'bio[\s-]*ceramic', r'hydroxyapatite', r'tricalcium\s*phosphate',
        r'bioceramic', r'biomedical', r'dental\s*ceramic', r'bone\s*implant',
        r'tissue\s*engineer', r'scaffold.*bone', r'biocompat',
        r'生物陶瓷', r'羟基磷灰石', r'牙科陶瓷', r'骨修复',
        r'植入', r'生物相容',
    ]),
    # 14. 环境净化 / 修复
    (14, '环境净化与环境修复材料', [
        r'photocatalytic\s*degrad', r'adsorpt', r'heavy\s*metal.*remov',
        r'waste\s*water\s*treat', r'air\s*purif', r'NOx\s*reduc',
        r'SOx\s*reduc', r'catalytic\s*convert', r'VOC\s*remov',
        r'flame\s*retard', r'environmental\s*remediation',
        r'环境净化', r'污水处理', r'重金属吸附', r'光催化降解',
        r'吸附材料', r'催化转化', r'阻燃',
    ]),
    # 15. 玻璃 / 玻璃陶瓷 / 地质聚合物
    (15, '玻璃、玻璃陶瓷及地质聚合物陶瓷', [
        r'glass[\s-]*ceramic', r'vitroceramic', r'geopolymer',
        r'sialate', r'fly\s*ash', r'slag\s*based',
        r'borosilicate', r'aluminosilicate.*glass',
        r'glass.*ceramic', r'透明微晶', r'微晶玻璃',
        r'地质聚合物', r'矿渣基', r'粉煤灰',
    ]),
    # 16. 室温/高温/超高温结构陶瓷
    (16, '室温、高温及超高温结构陶瓷', [
        r'SiC\b', r'Si3N4\b', r'Al2O3\b', r'ZrO2\b', r'TiO2\b',
        r'MgAl2O4', r'cordierite', r'mullite', r'aluminum\s nitride',
        r'SiC\s*fib', r'SiC\s*whisker', r'C\s*f\s*composite',
        r'C/SiC\b', r'SiC/SiC\b', r'ZrB2', r'HfB2', r'TaB2',
        r'creep\s*resist', r'high[\s-]*temperature.*struct',
        r'structural\s*ceramic', r'refractory\s*ceramic',
        r'structural\s*silicon', r'structural\s*alumina', r'structural\s*zirconia',
        r'碳化硅', r'氮化硅', r'氧化铝', r'氧化锆', r'高温结构陶瓷',
        r'莫来石', r'堇青石', r'超高温陶瓷', r'耐火陶瓷',
        r'\bCrNbO4\b', r'silicon\s*nitride.*ceramic', r'silicon\s*nitride.*metamaterial',
        r'phase\s*transform.*tough', r'stress[\s-]*induc.*phase', r'spinodal',
        r'1\s*GPa.*alumina', r'alumina.*ceramic', r'stacking\s*fault',
        r'SiBCN', r'SiHf', r'Si\s*Hf', r'polymer[\s-]*derived.*Si',
        r'compositional.*complex.*ceramic', r'microstructural\s*evolution',
        r'siO2.*phase\s*transition', r'phase\s*transition.*crack',
    ]),
    # 17. 工艺技术
    (17, '工艺技术 (粉体、成型、烧结、连接等)', [
        r'sinter', r'hot\s*press', r'spark\s*plasma\s*sinter',
        r'SPS\b', r'HIP\b', r'flash\s*sinter', r'microwave\s*sinter',
        r'cold\s*sinter', r'solution\s*combustion', r'sol[\s-]*gel',
        r'precipit', r'hydrothermal', r'solvothermal', r'mechanochem',
        r'powder\s*prepar', r'ball\s*mill', r'planetary\s*mill',
        r'forming', r'injection\s*mold', r'tape\s*cast', r'dry\s*press',
        r'Cold\s*Isostatic\s*Press', r'CIP\b', r'rolling\s*assisted',
        r'joining', r'brazing', r'diffusion\s*bond', r'welding.*ceramic',
        r'表面改性', r'热处理', r'涂层工艺', r'镀膜',
        r'烧结', r'球磨', r'热等静压', r'放电等离子', r'SPS',
        r'成型', r'连接', r'焊接', r'溶胶凝胶', r'水热法',
        r'ultrasonic[\s-]*vibrat', r'laser\s*sinter', r'3D\s*print',  # 3D打印已在#1处理
    ]),
    # 18. 性能测试与评价
    (18, '性能测试与评价技术', [
        r'mechanical\s*proper', r'tensile\s*strength', r'flexural\s*strength',
        r'compressive\s*strength', r'fracture\s*toughness', r'Vickers\s*hardness',
        r'nanoindent', r'thermal\s*conductivit', r'thermal\s*expansion',
        r'differential\s*thermal', r'DTA\b', r'TGA\b', r'DSC\b',
        r'impedance\s*analy', r'Raman', r'XRD\b', r'SEM.*analy',
        r'finite\s*element', r'FEM\b', r'measurement\s*technique',
        r'力学性能', r'热导率', r'热膨胀', r'硬度', r'强度',
        r'断裂韧性', r'测试方法', r'表征技术', r'有限元',
        # Simulation and 计算 - 这个单独拎出来
    ]),
    # 19. 材料计算与模拟 (最低优先级)
    (19, '材料计算与模拟', [
        r'density\s*functional', r'DFT\b', r'first[\s-]*principles',
        r'molecular\s*dynamics', r'MD\s*simul', r'Monte\s*Carlo',
        r'phase[\s-]*field', r'CALPHAD', r'thermodynamic\s*calculat',
        r'computational\s*screening', r'ab\s*initio', r'Boltzmann',
        r'machine\s*learning.*ceramic', r'deep\s*learning.*ceramic',
        r'artificial\s*neural', r'data[\s-]*driven.*design',
        r'第一性原理', r'分子动力学', r'蒙特卡罗', r'相场模拟',
        r'计算模拟', r'DFT计算', r'MD模拟', r'机器学习.*陶瓷',
        r'machine[\s-]*learning.*discovery', r'machine[\s-]*learning.*Guided',
        # 电子结构/晶体结构验证 -> 测试/评价
        r'crystal\s*structure.*valid', r'direct\s*experimental.*crystal',
        r'chemical\s*bonding.*modulat', r'orbital\s*hybrid',
        # 电场辅助合成
        r'under\s*electric\s*field', r'electric\s*field.*synth',
        r'LiCoO2', r'Ni[\s-]*metal',
    ]),
]


def classify(title: str) -> str | None:
    """根据标题匹配分类，返回分类名或 None"""
    title_lower = title.lower()
    for priority, category, keywords in CLASSIFICATION_RULES:
        for kw in keywords:
            if re.search(kw, title_lower, re.IGNORECASE):
                return category
    return None


def main():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # 添加 category 列（如果不存在）
    c.execute("PRAGMA table_info(articles)")
    cols = [row[1] for row in c.fetchall()]
    if 'category' not in cols:
        c.execute("ALTER TABLE articles ADD COLUMN category TEXT DEFAULT ''")
        print("Added 'category' column")

    # 分类统计
    c.execute('SELECT rowid, title FROM articles')
    rows = c.fetchall()
    stats: dict[str, int] = {}
    unclassified: list[str] = []

    for rowid, title in rows:
        cat = classify(title)
        if cat:
            c.execute("UPDATE articles SET category = ? WHERE rowid = ?", (cat, rowid))
            stats[cat] = stats.get(cat, 0) + 1
        else:
            unclassified.append(title[:60])
            c.execute("UPDATE articles SET category = ? WHERE rowid = ?", ('未分类', rowid))
            stats['未分类'] = stats.get('未分类', 0) + 1

    conn.commit()

    # 输出统计
    print("\n=== 分类统计 ===")
    for cat, cnt in sorted(stats.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {cnt}")

    if unclassified:
        print(f"\n=== 未分类 ({len(unclassified)} 篇) ===")
        for t in unclassified[:10]:
            print(f"  - {t}")

    conn.close()
    print(f"\n完成！共处理 {len(rows)} 篇文章")


if __name__ == '__main__':
    main()
