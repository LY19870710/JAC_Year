import sqlite3
conn = sqlite3.connect('jac_articles.db')
c = conn.cursor()

# Classify all new 2026 articles (Iss.4, Iss.5, Iss.6)
classifications = {
    # Vol.15 Iss.4
    '10.26599/JAC.2026.9221276': ('Sintering, Processing & Densification', '烧结、制备与致密化'),
    '10.26599/JAC.2026.9221260': ('High-Entropy Ceramics & Novel Compositions', '高熵陶瓷与新型成分'),
    '10.26599/JAC.2026.9221261': ('Environmental & Thermal Barrier Coatings (EBC/TBC)', '环境/热障涂层'),
    '10.26599/JAC.2026.9221262': ('Functional Ceramics: Sensors, Catalysis & Energy', '功能陶瓷：传感/催化/能源'),
    '10.26599/JAC.2026.9221263': ('Functional Ceramics: Sensors, Catalysis & Energy', '功能陶瓷：传感/催化/能源'),
    '10.26599/JAC.2026.9221264': ('Structural Ceramics: Mechanical & Tribological Properties', '结构陶瓷：力学与摩擦学'),
    '10.26599/JAC.2026.9221265': ('Dielectric, Piezoelectric & Ferroelectric Ceramics', '介电/压电/铁电陶瓷'),
    '10.26599/JAC.2026.9221266': ('Ultra-High Temperature Ceramics (UHTC)', '超高温陶瓷'),
    '10.26599/JAC.2026.9221267': ('High-Entropy Ceramics & Novel Compositions', '高熵陶瓷与新型成分'),
    '10.26599/JAC.2026.9221268': ('Optical, Luminescent & Transparent Ceramics', '光学、发光与透明陶瓷'),
    '10.26599/JAC.2026.9221269': ('Sintering, Processing & Densification', '烧结、制备与致密化'),
    '10.26599/JAC.2026.9221270': ('Functional Ceramics: Sensors, Catalysis & Energy', '功能陶瓷：传感/催化/能源'),
    '10.26599/JAC.2026.9221271': ('Ultra-High Temperature Ceramics (UHTC)', '超高温陶瓷'),
    '10.26599/JAC.2026.9221272': ('Structural Ceramics: Mechanical & Tribological Properties', '结构陶瓷：力学与摩擦学'),
    '10.26599/JAC.2026.9221273': ('High-Entropy Ceramics & Novel Compositions', '高熵陶瓷与新型成分'),
    '10.26599/JAC.2026.9221274': ('Structural Ceramics: Mechanical & Tribological Properties', '结构陶瓷：力学与摩擦学'),
    '10.26599/JAC.2026.9221275': ('Environmental & Thermal Barrier Coatings (EBC/TBC)', '环境/热障涂层'),
    '10.26599/JAC.2026.9221277': ('Sintering, Processing & Densification', '烧结、制备与致密化'),
    
    # Vol.15 Iss.5
    '10.26599/JAC.2026.9221278': ('Structural Ceramics: Mechanical & Tribological Properties', '结构陶瓷：力学与摩擦学'),
    '10.26599/JAC.2026.9221279': ('Environmental & Thermal Barrier Coatings (EBC/TBC)', '环境/热障涂层'),
    '10.26599/JAC.2026.9221280': ('Functional Ceramics: Sensors, Catalysis & Energy', '功能陶瓷：传感/催化/能源'),
    '10.26599/JAC.2026.9221281': ('Ultra-High Temperature Ceramics (UHTC)', '超高温陶瓷'),
    '10.26599/JAC.2026.9221282': ('Environmental & Thermal Barrier Coatings (EBC/TBC)', '环境/热障涂层'),
    '10.26599/JAC.2026.9221283': ('Sintering, Processing & Densification', '烧结、制备与致密化'),
    '10.26599/JAC.2026.9221284': ('Functional Ceramics: Sensors, Catalysis & Energy', '功能陶瓷：传感/催化/能源'),
    '10.26599/JAC.2026.9221285': ('Ultra-High Temperature Ceramics (UHTC)', '超高温陶瓷'),
    '10.26599/JAC.2026.9221286': ('Structural Ceramics: Mechanical & Tribological Properties', '结构陶瓷：力学与摩擦学'),
    '10.26599/JAC.2026.9221287': ('Environmental & Thermal Barrier Coatings (EBC/TBC)', '环境/热障涂层'),
    '10.26599/JAC.2026.9221288': ('Environmental & Thermal Barrier Coatings (EBC/TBC)', '环境/热障涂层'),
    '10.26599/JAC.2026.9221289': ('Functional Ceramics: Sensors, Catalysis & Energy', '功能陶瓷：传感/催化/能源'),
    '10.26599/JAC.2026.9221290': ('Ultra-High Temperature Ceramics (UHTC)', '超高温陶瓷'),
    '10.26599/JAC.2026.9221291': ('Environmental & Thermal Barrier Coatings (EBC/TBC)', '环境/热障涂层'),
    '10.26599/JAC.2026.9221292': ('Ultra-High Temperature Ceramics (UHTC)', '超高温陶瓷'),
    '10.26599/JAC.2026.9221293': ('Functional Ceramics: Sensors, Catalysis & Energy', '功能陶瓷：传感/催化/能源'),
    '10.26599/JAC.2026.9221294': ('Structural Ceramics: Mechanical & Tribological Properties', '结构陶瓷：力学与摩擦学'),
    
    # Vol.15 Iss.6
    '10.26599/JAC.2026.9221295': ('Dielectric, Piezoelectric & Ferroelectric Ceramics', '介电/压电/铁电陶瓷'),
    '10.26599/JAC.2026.9221296': ('Functional Ceramics: Sensors, Catalysis & Energy', '功能陶瓷：传感/催化/能源'),
    '10.26599/JAC.2026.9221297': ('Functional Ceramics: Sensors, Catalysis & Energy', '功能陶瓷：传感/催化/能源'),
    '10.26599/JAC.2026.9221298': ('Environmental & Thermal Barrier Coatings (EBC/TBC)', '环境/热障涂层'),
    '10.26599/JAC.2026.9221299': ('Ultra-High Temperature Ceramics (UHTC)', '超高温陶瓷'),
    '10.26599/JAC.2026.9221300': ('Ultra-High Temperature Ceramics (UHTC)', '超高温陶瓷'),
    '10.26599/JAC.2026.9221301': ('Environmental & Thermal Barrier Coatings (EBC/TBC)', '环境/热障涂层'),
    '10.26599/JAC.2026.9221302': ('Ultra-High Temperature Ceramics (UHTC)', '超高温陶瓷'),
    '10.26599/JAC.2026.9221303': ('Environmental & Thermal Barrier Coatings (EBC/TBC)', '环境/热障涂层'),
    '10.26599/JAC.2026.9221304': ('Ultra-High Temperature Ceramics (UHTC)', '超高温陶瓷'),
    '10.26599/JAC.2026.9221305': ('Environmental & Thermal Barrier Coatings (EBC/TBC)', '环境/热障涂层'),
    '10.26599/JAC.2026.9221306': ('Ultra-High Temperature Ceramics (UHTC)', '超高温陶瓷'),
    '10.26599/JAC.2026.9221307': ('Environmental & Thermal Barrier Coatings (EBC/TBC)', '环境/热障涂层'),
    '10.26599/JAC.2026.9221308': ('Ultra-High Temperature Ceramics (UHTC)', '超高温陶瓷'),
    '10.26599/JAC.2026.9221309': ('Environmental & Thermal Barrier Coatings (EBC/TBC)', '环境/热障涂层'),
    '10.26599/JAC.2026.9221310': ('Ultra-High Temperature Ceramics (UHTC)', '超高温陶瓷'),
    '10.26599/JAC.2026.9221311': ('Environmental & Thermal Barrier Coatings (EBC/TBC)', '环境/热障涂层'),
    '10.26599/JAC.2026.9221312': ('Ultra-High Temperature Ceramics (UHTC)', '超高温陶瓷'),
    '10.26599/JAC.2026.9221313': ('Environmental & Thermal Barrier Coatings (EBC/TBC)', '环境/热障涂层'),
    '10.26599/JAC.2026.9221314': ('Ultra-High Temperature Ceramics (UHTC)', '超高温陶瓷'),
}

for doi, (area, area_zh) in classifications.items():
    c.execute('UPDATE articles SET research_area = ?, research_area_zh = ? WHERE doi = ?', (area, area_zh, doi))

conn.commit()

# Verify
c.execute('SELECT research_area_zh, COUNT(*) FROM articles WHERE year = 2026 GROUP BY research_area_zh ORDER BY COUNT(*) DESC')
print('2026 分类汇总:')
for row in c.fetchall():
    print(f'  {row[1]:2d} | {row[0]}')

c.execute('SELECT COUNT(*) FROM articles WHERE year = 2026 AND (research_area = "" OR research_area IS NULL)')
print(f'\n未分类: {c.fetchone()[0]}')

c.execute('SELECT year, volume, issue, COUNT(*) FROM articles WHERE year=2026 GROUP BY volume, issue ORDER BY issue')
print('\n2026 各期:')
for row in c.fetchall():
    print(f'  Vol.{row[1]} Iss.{row[2]}: {row[3]} articles')

conn.close()
