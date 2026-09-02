import sqlite3, csv, sys, os
sys.stdout.reconfigure(encoding='utf-8')

conn = sqlite3.connect('jac_articles.db')
cur = conn.cursor()
cur.execute("SELECT doi, title, affiliations FROM articles WHERE affiliations != '' ORDER BY id")
rows = cur.fetchall()
conn.close()

outpath = 'E:/Claw/JAC_Year/scripts/affiliations_review.csv'
with open(outpath, 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['doi', 'title', 'affiliations_raw'])
    writer.writerows(rows)

print(f'Exported {len(rows)} articles to {outpath}')
