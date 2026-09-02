"""Find the API endpoint for article body content."""
import re

html = open(r'D:/Claw/JAC_Year/articles_md/10_26599_JAC_2026_9221301_debug.html', 'r', encoding='utf-8').read()

# Look for API URLs, fetch calls, or data endpoints
print("=== Looking for API endpoints ===")
# Search for common API patterns
patterns = [
    r'api["\s:=]+["\']([^"\']+)["\']',
    r'url["\s:=]+["\']([^"\']*(?:article|content|body|text|detail)[^"\']*)["\']',
    r'fetch\(["\']([^"\']+)["\']',
    r'axios\.[a-z]+\(["\']([^"\']+)["\']',
    r'\.get\(["\']([^"\']+)["\']',
    r'fullTextInfo',
    r'contentList',
    r'article_content',
    r'/article/[a-z]+',
]

for pat in patterns:
    matches = re.findall(pat, html, re.I)
    if matches:
        print(f"  Pattern '{pat}':")
        for m in set(matches):
            print(f"    {m}")

# Look for the fullTextInfo or similar JS variables
print("\n=== Looking for JS data variables ===")
for match in re.finditer(r'(?:var|let|const)\s+(\w*(?:content|article|text|body|fulltext)\w*)\s*=', html, re.I):
    print(f"  Variable: {match.group(1)}")

# Look for data attributes on the article app
print("\n=== article-app data ===")
app_match = re.search(r'id="article-app"[^>]*', html)
if app_match:
    print(f"  {app_match.group(0)[:500]}")

# Look for any data-url or data-api attributes
print("\n=== data-* attributes ===")
for match in re.finditer(r'data-(?:url|api|src|content|id)="([^"]+)"', html, re.I):
    print(f"  {match.group(0)[:150]}")

# Look for the internal article ID and any API that might use it
print("\n=== Internal IDs ===")
for match in re.finditer(r'(?:article[_-]?id|content[_-]?id)["\s:=]+["\']?(\d+)', html, re.I):
    print(f"  ID: {match.group(1)}")

# Look for any URLs that might be API endpoints in script tags
print("\n=== Script tag URLs ===")
scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)
for script in scripts:
    urls = re.findall(r'["\']([^"\']*(?:/api/|/article/)[^"\']*)["\']', script)
    for url in set(urls):
        if len(url) > 5 and len(url) < 200:
            print(f"  {url}")
