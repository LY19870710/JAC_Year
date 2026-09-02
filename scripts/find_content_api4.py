"""Fetch and analyze the article JS file."""
import re
import requests

# The main article JS file
url = "https://www.sciopen.com/assets/js/article-c7bb56e3392f7d27f3fd6fdc99adc4cf.js"
resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
js = resp.text
print(f"JS file length: {len(js)}")

# Search for contentList, full_text, fullText, content
for pattern in ['contentList', 'full_text', 'fullText', 'content']:
    matches = list(re.finditer(r'.{0,150}' + pattern + r'.{0,300}', js))
    if matches:
        print(f"\n=== '{pattern}' found {len(matches)} times ===")
        for m in matches[:5]:
            print(f"  {m.group(0)[:350]}")
            print()

# Also search for AJAX calls
print("\n=== AJAX calls ===")
for match in re.finditer(r'(?:axios|ajax|get|post)\.{0,50}', js):
    print(f"  {match.group(0)[:200]}")
