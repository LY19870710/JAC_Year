"""Deep dive into the full_text API response."""
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

# Get full_text API
url = f"{BASE_URL}/article/full_text?doi={doi}"
resp = requests.get(url, headers=HEADERS, timeout=30)
data = resp.json()

obj = data.get('object', {})
print(f"Object keys: {list(obj.keys())}")

# Check if there's a contentHtml or similar field
for key in obj.keys():
    val = obj[key]
    if isinstance(val, str):
        text_len = len(val)
        text_preview = val[:200] if text_len > 0 else ''
        print(f"  {key}: string, len={text_len}, preview: {text_preview}")
    elif isinstance(val, list):
        print(f"  {key}: list, len={len(val)}")
    elif isinstance(val, dict):
        print(f"  {key}: dict, keys={list(val.keys())}")
    elif isinstance(val, bool):
        print(f"  {key}: bool = {val}")
    else:
        print(f"  {key}: {type(val).__name__} = {val}")

# Check the trees more carefully - look at content field
trees = obj.get('trees', [])
print(f"\n=== First tree node (full) ===")
if trees:
    print(json.dumps(trees[0], indent=2, ensure_ascii=False)[:2000])

# Check if content is HTML
print(f"\n=== Checking content fields ===")
def check_content(nodes, depth=0):
    for node in nodes:
        content = node.get('content', '')
        if content.strip():
            text = re.sub(r'<[^>]+>', '', content)
            text = re.sub(r'\s+', ' ', text).strip()
            if text:
                print(f"  {'  ' * depth}{node['label']} {node['title']}: content has text ({len(text)} chars)")
                print(f"    Preview: {text[:150]}")
            else:
                print(f"  {'  ' * depth}{node['label']} {node['title']}: content is HTML-only ({len(content)} chars)")
                print(f"    HTML: {content[:200]}")
        if node.get('children'):
            check_content(node['children'], depth + 1)

check_content(trees)

# Save full API response for inspection
with open(r'D:/Claw/JAC_Year/scripts/full_text_api_response.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print("\nFull API response saved to scripts/full_text_api_response.json")
