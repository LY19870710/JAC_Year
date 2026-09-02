"""Extract the fullTextInfo JS variable and API calls."""
import re
import json

html = open(r'D:/Claw/JAC_Year/articles_md/10_26599_JAC_2026_9221301_debug.html', 'r', encoding='utf-8').read()

# Find fullTextInfo assignment
for match in re.finditer(r'(?:var|let|const)?\s*fullTextInfo\s*=\s*(\{.*?\});', html, re.DOTALL):
    print("=== fullTextInfo ===")
    raw = match.group(1)[:2000]
    print(raw)
    print()
    # Try to parse as JSON
    try:
        data = json.loads(match.group(1))
        print("Parsed successfully!")
        print(json.dumps(data, indent=2, ensure_ascii=False)[:3000])
    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}")

# Look for the full_text API call
print("\n=== full_text API context ===")
for match in re.finditer(r'.{0,100}/article/full_text.{0,200}', html):
    print(f"  {match.group(0)}")

# Look for contentHtml variables
print("\n=== contentHtml assignments ===")
for match in re.finditer(r'contentHtml\s*=\s*(.{0,500})', html):
    print(f"  {match.group(0)[:300]}")
    print()

# Look for ifShowFullText
print("\n=== ifShowFullText ===")
for match in re.finditer(r'ifShowFullText\s*=\s*(.{0,100})', html):
    print(f"  {match.group(0)}")

# Look for articleId
print("\n=== articleId ===")
for match in re.finditer(r'articleId\s*[=:]\s*(.{0,100})', html):
    print(f"  {match.group(0)}")
