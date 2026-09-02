"""Get the full article body content from the API."""
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

# Extract the tree structure
trees = data.get('object', {}).get('trees', [])
print(f"Total top-level sections: {len(trees)}")

# Print the tree structure
def print_tree(nodes, indent=0):
    for node in nodes:
        prefix = "  " * indent
        has_content = bool(node.get('content', '').strip())
        content_preview = ''
        if has_content:
            # Check if content has actual text (not just HTML tags)
            text = re.sub(r'<[^>]+>', '', node.get('content', ''))
            text = re.sub(r'\s+', ' ', text).strip()
            content_preview = f" [content: {len(node['content'])} chars, text: '{text[:80]}...']" if text else f" [content: {len(node['content'])} chars, empty text]"
        print(f"{prefix}- {node.get('label', '')} {node.get('title', '')}{content_preview}")
        if node.get('children'):
            print_tree(node['children'], indent + 1)

print_tree(trees)

# Now let's check if there's a separate API for section content
# Try fetching content for a specific section
print("\n\n=== Trying section content API ===")
# Look for patterns like /article/content?key=s01&doi=xxx
section_keys = ['s01', 's02', 's02-01']
for key in section_keys:
    for api_pattern in [
        f"{BASE_URL}/article/content?key={key}&doi={doi}",
        f"{BASE_URL}/article/section?key={key}&doi={doi}",
        f"{BASE_URL}/article/full_text?doi={doi}&key={key}",
        f"{BASE_URL}/article/full_text/{key}?doi={doi}",
    ]:
        try:
            r = requests.get(api_pattern, headers=HEADERS, timeout=10)
            if r.status_code == 200 and len(r.text) > 100:
                ct = r.headers.get('content-type', '')
                print(f"  {api_pattern}")
                print(f"    Status: {r.status_code}, Type: {ct}, Length: {len(r.text)}")
                if 'json' in ct:
                    try:
                        j = r.json()
                        print(f"    JSON keys: {list(j.keys()) if isinstance(j, dict) else 'array'}")
                        print(f"    Preview: {json.dumps(j, ensure_ascii=False)[:300]}")
                    except:
                        print(f"    Preview: {r.text[:300]}")
                else:
                    print(f"    Preview: {r.text[:300]}")
                break
        except:
            pass
