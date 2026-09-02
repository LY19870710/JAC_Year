import sqlite3, json, subprocess, sys, os, re
from pathlib import Path

DB_PATH = Path(r"E:\Claw\JAC_Year\jac_articles.db")
FETCH_DETAIL_JS = Path(r"E:\Claw\sciopen_scraper\fetch_detail.js")
NODE_MODULES = Path(r"E:\Claw\sciopen_scraper\node_modules")

conn = sqlite3.connect(str(DB_PATH))

rows = conn.execute("SELECT id, doi, url FROM articles WHERE corresponding_email IS NULL OR corresponding_email = ''").fetchall()
print(f"Processing {len(rows)} articles...")

articles = [{"doi": r[1], "url": r[2]} for r in rows]
tmp = Path("backfill_all_temp.json")
tmp.write_text(json.dumps(articles), encoding="utf-8")

result = subprocess.run(
    ["node", str(FETCH_DETAIL_JS), "--batch", str(tmp.absolute())],
    capture_output=True, timeout=1800,
    cwd=str(NODE_MODULES.parent),
    env={**os.environ, "NODE_PATH": str(NODE_MODULES)}
)
tmp.unlink(missing_ok=True)

print(f"Return code: {result.returncode}")

stdout = result.stdout.decode("utf-8", errors="replace")
json_match = re.search(r'\{[\s\S]*\}', stdout)
if not json_match:
    print("No JSON found")
    sys.exit(1)

details = json.loads(json_match.group())
print(f"Parsed {len(details)} results")

updated = 0
for row in rows:
    id, doi, url = row
    d = details.get(doi, {})
    email = d.get("corresponding_email", "")
    if email:
        conn.execute("UPDATE articles SET corresponding_email = ? WHERE id = ?", (email, id))
        updated += 1

conn.commit()
print(f"Updated {updated} articles")
has_email = conn.execute("SELECT COUNT(*) FROM articles WHERE corresponding_email IS NOT NULL AND corresponding_email != ''").fetchone()[0]
print(f"Total with email: {has_email}")
conn.close()
