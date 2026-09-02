"""Search all JS in the page for contentList loading."""
import re

html = open(r'D:/Claw/JAC_Year/articles_md/10_26599_JAC_2026_9221301_debug.html', 'r', encoding='utf-8').read()

# Find all script content
scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)

# Search for the AJAX call that loads contentList
for i, script in enumerate(scripts):
    # Look for patterns where contentList is loaded
    if 'contentList' in script or 'JSON.parse(data)' in script:
        print(f"\n=== Script #{i} (len={len(script)}) ===")
        # Find the context around contentList = JSON.parse(data)
        for match in re.finditer(r'.{0,500}JSON\.parse\(data\).{0,500}', script):
            print(f"  {match.group(0)[:600]}")
            print()
        
        # Also look for $.ajax or $.get calls
        for match in re.finditer(r'(?:\$\.ajax|\$\.get|\$\.post)\s*\(.*?\)\s*', script, re.DOTALL):
            call = match.group(0)[:400]
            print(f"  AJAX: {call}")
            print()

# Also search for the URL pattern used to load content
print("\n=== Looking for content URL patterns ===")
for match in re.finditer(r'["\'][^"\']*(?:content|full)[^"\']*["\']\s*[,\)]', html):
    url = match.group(0)
    if '/article/' in url or 'doi' in url:
        print(f"  {url}")
