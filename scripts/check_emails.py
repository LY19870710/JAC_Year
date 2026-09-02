import sqlite3
conn = sqlite3.connect(r'D:/Claw/JAC_Year/jac_articles.db')
c = conn.cursor()
c.execute("SELECT doi, corresponding_authors, corresponding_emails FROM articles WHERE corresponding_emails IS NOT NULL AND corresponding_emails != '' LIMIT 3")
for r in c.fetchall():
    print(r)
conn.close()
