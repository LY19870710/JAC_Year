import sqlite3

conn = sqlite3.connect(r'D:/Claw/JAC_Year/jac_articles.db')
c = conn.cursor()

c.execute("SELECT count(*) FROM articles")
print(f"Total articles: {c.fetchone()[0]}")

c.execute('SELECT count(*) FROM articles WHERE abstract IS NOT NULL AND abstract != ""')
print(f"With abstract: {c.fetchone()[0]}")

c.execute('SELECT count(*) FROM articles WHERE keywords IS NOT NULL AND keywords != ""')
print(f"With keywords: {c.fetchone()[0]}")

c.execute('SELECT count(*) FROM articles WHERE citation IS NOT NULL AND citation != ""')
print(f"With citation: {c.fetchone()[0]}")

c.execute('SELECT count(*) FROM articles WHERE funding IS NOT NULL AND funding != ""')
print(f"With funding: {c.fetchone()[0]}")

c.execute('SELECT count(*) FROM articles WHERE corresponding_authors IS NOT NULL AND corresponding_authors != ""')
print(f"With corresponding_authors: {c.fetchone()[0]}")

c.execute('SELECT count(*) FROM articles WHERE institutions IS NOT NULL AND institutions != ""')
print(f"With institutions: {c.fetchone()[0]}")

c.execute('SELECT count(*) FROM articles WHERE received_date IS NOT NULL AND received_date != ""')
print(f"With received_date: {c.fetchone()[0]}")

c.execute('SELECT count(*) FROM articles WHERE accepted_date IS NOT NULL AND accepted_date != ""')
print(f"With accepted_date: {c.fetchone()[0]}")

c.execute('SELECT count(*) FROM articles WHERE published_date IS NOT NULL AND published_date != ""')
print(f"With published_date: {c.fetchone()[0]}")

c.execute('SELECT count(*) FROM articles WHERE affiliations IS NOT NULL AND affiliations != ""')
print(f"With affiliations: {c.fetchone()[0]}")

conn.close()
