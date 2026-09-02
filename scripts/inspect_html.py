"""Inspect the raw HTML to find the article body container."""
import re

html = open(r'D:/Claw/JAC_Year/articles_md/10_26599_JAC_2026_9221301_debug.html', 'r', encoding='utf-8').read()

# Find divs with 'article' or 'content' in class
matches = re.findall(r'<div[^>]*class="([^"]*(?:article|content|body|text|main)[^"]*)"[^>]*>', html, re.I)
for m in set(matches):
    print(f"class: {m}")

print("\n--- DIVs with 'article' in id ---")
id_matches = re.findall(r'<div[^>]*id="([^"]*(?:article|content|body|text|main)[^"]*)"[^>]*>', html, re.I)
for m in set(id_matches):
    print(f"id: {m}")

print("\n--- Looking for abstract/body area ---")
# Find text around 'Abstract'
abstract_pos = html.lower().find('abstract')
if abstract_pos > 0:
    snippet = html[max(0, abstract_pos-500):abstract_pos+2000]
    # Print tag structure
    for match in re.finditer(r'<(/?)(\w+)[^>]*?(/?)>', snippet):
        tag = match.group(0)[:120]
        pos = match.start()
        print(f"  pos={pos}: {tag}")

print("\n--- All unique class names containing 'article' or 'content' ---")
all_classes = set()
for m in re.finditer(r'class="([^"]+)"', html):
    classes = m.group(1).split()
    for c in classes:
        if 'article' in c.lower() or 'content' in c.lower() or 'body' in c.lower():
            all_classes.add(c)
for c in sorted(all_classes):
    print(f"  {c}")
