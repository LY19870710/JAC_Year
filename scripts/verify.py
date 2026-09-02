import sqlite3

conn = sqlite3.connect(r'D:/Claw/JAC_Year/jac_articles.db')
c = conn.cursor()

c.execute('SELECT id, doi, length(full_md) FROM articles LIMIT 5')
for r in c.fetchall():
    print(r)

print('---')
empty = "''"
c.execute(f"SELECT count(*) FROM articles WHERE full_md IS NOT NULL AND full_md != {empty}")
print('articles with full_md:', c.fetchone()[0])

# Check month field
c.execute('SELECT DISTINCT month FROM articles LIMIT 10')
print('Sample months:', c.fetchall())

conn.close()
