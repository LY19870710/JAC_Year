import sqlite3, time

db = r'E:\Claw\JAC_Year\jac_articles.db'
conn = sqlite3.connect(db)
cur = conn.cursor()

# 1. 检查现有索引
print('=== 现有索引 ===')
cur.execute("SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='articles'")
indexes = cur.fetchall()
if not indexes:
    print('(无自定义索引)')
else:
    for row in indexes:
        sql_preview = row[1][:80] if row[1] else '(auto)'
        print(f'{row[0]}: {sql_preview}')

# 2. 测试添加索引前的查询性能
print('\n=== 性能测试（添加索引前）===')
tests = [
    ('按DOI精确查询', 'SELECT * FROM articles WHERE doi = ?', ('10.26599/JAC.2025.9221150',)),
    ('按年份+期号查询', 'SELECT COUNT(*) FROM articles WHERE year=? AND issue=?', (2025, 1)),
    ('按研究方向查询', 'SELECT COUNT(*) FROM articles WHERE research_area_zh = ?', ('介电/压电/铁电陶瓷',)),
    ('按年份范围查询', 'SELECT COUNT(*) FROM articles WHERE year BETWEEN ? AND ?', (2024, 2025)),
]

for test_name, sql, params in tests:
    start = time.time()
    cur.execute(sql, params)
    cur.fetchall()
    elapsed = (time.time() - start) * 1000
    print(f'  {test_name}: {elapsed:.2f}ms')

# 3. 检查表结构
print('\n=== articles 表结构 ===')
cur.execute('PRAGMA table_info(articles)')
columns = [row[1] for row in cur.fetchall()]
print(f'  列数: {len(columns)}')
print(f'  关键列: doi, year, issue, research_area_zh, published_date')

conn.close()
print('\n完成！')
