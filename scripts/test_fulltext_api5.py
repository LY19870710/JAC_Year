"""Check if the main text content is embedded in the page HTML or loaded via separate API."""
import requests
import json
import re

BASE_URL = "https://www.sciopen.com"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "application/json, text/html, */*",
    "Referer": "https://www.sciopen.com/article/10.26599/JAC.2026.9221301",
}

doi = "10.26599/JAC.2026.9221301"

# The full_text API has trees with empty content, but maybe there's another API
# Let's try to find the actual content API by checking what the JS does

# Try various API patterns that might return section content
apis = [
    f"{BASE_URL}/article/full_text/content?doi={doi}",
    f"{BASE_URL}/article/full_text/section?doi={doi}",
    f"{BASE_URL}/article/section?doi={doi}",
    f"{BASE_URL}/article/content/list?doi={doi}",
    f"{BASE_URL}/article/content?doi={doi}",
    f"{BASE_URL}/article/article?doi={doi}",
    f"{BASE_URL}/article/detail?doi={doi}",
    f"{BASE_URL}/article/full?doi={doi}",
]

for api in apis:
    try:
        r = requests.get(api, headers=HEADERS, timeout=10)
        ct = r.headers.get('content-type', '')
        if r.status_code == 200 and 'json' in ct:
            try:
                j = r.json()
                has_content = bool(j.get('object', j.get('data', '')))
                print(f"  {api}")
                print(f"    Status: {r.status_code}, JSON keys: {list(j.keys()) if isinstance(j, dict) else type(j)}")
                if has_content:
                    print(f"    Preview: {json.dumps(j, ensure_ascii=False)[:300]}")
            except:
                pass
        elif r.status_code == 200 and len(r.text) > 500:
            print(f"  {api}")
            print(f"    Status: {r.status_code}, Type: {ct}, Length: {len(r.text)}")
            print(f"    Preview: {r.text[:200]}")
    except Exception as e:
        pass

# Let's also check if the content is in the page HTML as a JS variable
print("\n\n=== Checking page HTML for content data ===")
html = open(r'D:/Claw/JAC_Year/articles_md/10_26599_JAC_2026_9221301_debug.html', 'r', encoding='utf-8').read()

# Look for contentHtml assignments with actual content
for match in re.finditer(r'contentHtml\s*=\s*contentHtml\s*\+\s*(.{0,500})', html):
    snippet = match.group(1)
    # Check if it has actual text content (not just tags)
    text = re.sub(r'<[^>]+>', '', snippet)
    text = re.sub(r'\\u0027|\\u003c|\\u003e|\\n|\\t', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    if len(text) > 50:
        print(f"  Content snippet: {snippet[:300]}")
        print(f"  Text: {text[:200]}")
        print()
