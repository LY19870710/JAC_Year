import sqlite3
conn = sqlite3.connect(r"E:\Claw\JAC_Year\jac_articles.db")
# 检查是否有 corresponding_authors 列
cols = [r[1] for r in conn.execute("PRAGMA table_info(articles)")]
print("Columns:", cols)
if "corresponding_authors" not in cols:
    conn.execute("ALTER TABLE articles ADD COLUMN corresponding_authors TEXT DEFAULT ''")
    conn.commit()
    print("Added corresponding_authors column")
else:
    print("corresponding_authors already exists")
conn.close()
