import sqlite3
conn = sqlite3.connect('jac_articles.db')
c = conn.cursor()
c.execute('SELECT COUNT(*) FROM articles WHERE year = 2026')
db_2026 = c.fetchone()[0]
print(f'DB 2026 articles: {db_2026}')

# Check how many articles have 2025 DOI but 2026 year
c.execute('SELECT COUNT(*) FROM articles WHERE year = 2026 AND doi LIKE "10.26599/JAC.2025%"')
wrong_doi = c.fetchone()[0]
print(f'2026 articles with 2025 DOI: {wrong_doi}')

c.execute('SELECT doi, title FROM articles WHERE year = 2026 AND doi LIKE "10.26599/JAC.2025%" LIMIT 5')
for row in c.fetchall():
    print(f'  {row[0]}: {row[1][:50]}')

conn.close()
