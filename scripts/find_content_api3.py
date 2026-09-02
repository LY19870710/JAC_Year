"""Find the external JS file that loads contentList."""
import re
import requests

html = open(r'D:/Claw/JAC_Year/articles_md/10_26599_JAC_2026_9221301_debug.html', 'r', encoding='utf-8').read()

# Find all external script sources
script_srcs = re.findall(r'<script[^>]*src="([^"]+)"[^>]*>', html)
print("External JS files:")
for src in script_srcs:
    print(f"  {src}")

# Look for JS files that might contain the article content loading logic
print("\n=== Searching for content-related JS ===")
for src in script_srcs:
    if 'article' in src.lower() or 'chunk' in src.lower() or 'app' in src.lower():
        url = src if src.startswith('http') else f"https://www.sciopen.com{src}"
        print(f"\nFetching: {url}")
        try:
            resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
            if resp.status_code == 200:
                js = resp.text
                # Search for contentList or full_text
                if 'contentList' in js or 'full_text' in js:
                    print(f"  FOUND! Length: {len(js)}")
                    for match in re.finditer(r'.{0,100}(?:contentList|full_text|fullText).{0,300}', js):
                        print(f"    {match.group(0)[:300]}")
                        print()
                else:
                    print(f"  Not found in this file (len={len(js)})")
        except Exception as e:
            print(f"  Error: {e}")
