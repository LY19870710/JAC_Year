import sqlite3, time

db = r'E:\Claw\JAC_Year\jac_articles.db'
conn = sqlite3.connect(db)
cur = conn.cursor()

print('=== 添加缺失索引 ===')

# 1. 添加 research_area_zh 索引
print('\n1. 添加 idx_research_area_zh...')
try:
    cur.execute('CREATE INDEX IF NOT EXISTS idx_research_area_zh ON articles(research_area_zh)')
    print('   ✅ 成功')
except Exception as e:
    print(f'   ❌ 失败: {e}')

# 2. 添加 (year, issue) 组合索引
print('2. 添加 idx_year_issue (组合索引)...')
try:
    cur.execute('CREATE INDEX IF NOT EXISTS idx_year_issue ON articles(year, issue)')
    print('   ✅ 成功')
except Exception as e:
    print(f'   ❌ 失败: {e}')

# 3. 添加 published_date 索引
print('3. 添加 idx_published_date...')
try:
    cur.execute('CREATE INDEX IF NOT EXISTS idx_published_date ON articles(published_date)')
    print('   ✅ 成功')
except Exception as e:
    print(f'   ❌ 失败: {e}')

# 4. 删除过时索引 idx_category
print('4. 删除过时索引 idx_category...')
try:
    cur.execute('DROP INDEX IF EXISTS idx_category')
    print('   ✅ 成功')
except Exception as e:
    print(f'   ❌ 失败: {e}')

conn.commit()

# 5. 测试添加索引后的性能
print('\n=== 性能测试（添加索引后）===')
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
    print(f'   {test_name}: {elapsed:.2f}ms')

# 6. 检查新索引列表
print('\n=== 更新后的索引列表 ===')
cur.execute("SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='articles'")
for row in cur.fetchall():
    sql_preview = row[1][:60] if row[1] else '(auto)'
    print(f'   {row[0]}: {sql_preview}...')

conn.close()
print('\n✅ 索引优化完成！')
