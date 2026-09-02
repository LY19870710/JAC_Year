import sqlite3, json, sys, os
sys.stdout.reconfigure(encoding='utf-8')
conn = sqlite3.connect('jac_articles.db')
conn.row_factory = sqlite3.Row
rows = conn.execute("SELECT doi, corresponding_authors, corresponding_emails, affiliations FROM articles WHERE corresponding_authors != '' LIMIT 5").fetchall()
for r in rows:
    print('DOI:', r['doi'])
    print('  authors:', r['corresponding_authors'])
    print('  emails:', r['corresponding_emails'])
    print('  affiliations:', (r['affiliations'] or '')[:120])
    print()
conn.close()
