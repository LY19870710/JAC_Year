"""Find the actual content loading API by analyzing the JS in the page."""
import re

html = open(r'D:/Claw/JAC_Year/articles_md/10_26599_JAC_2026_9221301_debug.html', 'r', encoding='utf-8').read()

# Find all script tags with content
scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)

print(f"Total script tags: {len(scripts)}")

# Look for the script that handles fullTextInfo
for i, script in enumerate(scripts):
    if 'fullTextInfo' in script or 'contentList' in script or 'insert_content' in script:
        print(f"\n=== Script #{i} (len={len(script)}) ===")
        # Find relevant sections
        for match in re.finditer(r'.{0,100}(?:fullTextInfo|contentList|insert_content|contentHtml).{0,300}', script):
            snippet = match.group(0)
            # Clean up for readability
            print(f"  {snippet}")
            print()
