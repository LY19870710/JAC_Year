import sqlite3

conn = sqlite3.connect('jac_articles.db')
c = conn.cursor()

# Count Erratum and Retraction articles
c.execute("SELECT type, COUNT(*) FROM articles WHERE type IN ('Erratum', 'Retraction') GROUP BY type")
for row in c.fetchall():
    print(f'{row[0]}: {row[1]} articles')

# Delete them
c.execute("DELETE FROM articles WHERE type IN ('Erratum', 'Retraction')")
deleted = c.rowcount
conn.commit()

print(f'\nDeleted {deleted} articles')

# Verify
c.execute("SELECT year, COUNT(*) FROM articles GROUP BY year ORDER BY year")
for row in c.fetchall():
    print(f'{row[0]}: {row[1]} articles')

conn.close()
