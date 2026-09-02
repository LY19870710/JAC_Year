"""Find the contentList API URL."""
import re

html = open(r'D:/Claw/JAC_Year/articles_md/10_26599_JAC_2026_9221301_debug.html', 'r', encoding='utf-8').read()

# Find the script that makes the AJAX call for contentList
scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)

for i, script in enumerate(scripts):
    if "contentList" in script and "JSON.parse" in script:
        print(f"=== Script #{i} ===")
        # Find the AJAX call that loads contentList
        # Look for patterns like $.ajax, $.get, $.post, fetch, axios
        for match in re.finditer(r'.{0,200}(?:\$\.ajax|\$\.get|\$\.post|\.ajax|get\(|post\().{0,500}', script):
            snippet = match.group(0)
            if 'content' in snippet.lower() or 'full' in snippet.lower() or 'text' in snippet.lower():
                print(f"  {snippet}")
                print()
        
        # Look for the specific line where contentList is assigned
        for match in re.finditer(r'.{0,300}contentList.{0,300}', script):
            snippet = match.group(0)
            print(f"  CONTEXT: {snippet}")
            print()
