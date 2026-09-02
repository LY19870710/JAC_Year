"""Check insert_content and full body structure."""
from bs4 import BeautifulSoup
import re

html = open(r'D:/Claw/JAC_Year/articles_md/10_26599_JAC_2026_9221301_debug.html', 'r', encoding='utf-8').read()
soup = BeautifulSoup(html, 'html.parser')

center = soup.find('div', class_='art-html-center')

# Check all v4-art-content-p elements
content_ps = center.find_all('div', class_='v4-art-content-p')
print(f"Total v4-art-content-p: {len(content_ps)}")
for i, cp in enumerate(content_ps):
    h2 = cp.find('h2')
    h2_text = h2.get_text(strip=True) if h2 else '(no heading)'
    text_len = len(cp.get_text(strip=True))
    classes = cp.get('class', [])
    print(f"  [{i}] class={classes}, heading='{h2_text}', text_len={text_len}")

# Check insert_content
insert = soup.find(id='insert_content')
if insert:
    print(f"\n=== insert_content ===")
    print(f"  HTML length: {len(str(insert))}")
    print(f"  Text: {insert.get_text(strip=True)[:500]}")
    # Check children
    for child in insert.find_all(recursive=False):
        print(f"  Child: <{child.name}> id={child.get('id', '')} class={child.get('class', [])} text_len={len(child.get_text(strip=True))}")

# Check article_no_data
no_data = soup.find(id='article_no_data')
if no_data:
    print(f"\n=== article_no_data ===")
    print(f"  Text: {no_data.get_text(strip=True)}")

# Check references
refs = soup.find_all('div', class_='v4-art-reference-item')
print(f"\n=== References: {len(refs)} items ===")
for ref in refs[:3]:
    idx = ref.find('div', class_='v4-art-reference-item-index')
    title = ref.find('div', class_='v4-art-reference-item-title')
    print(f"  Index: {idx.get_text(strip=True) if idx else 'N/A'}")
    print(f"  Title: {title.get_text(strip=True)[:200] if title else 'N/A'}")
    print()

# Check all h2/h3 headings in the article
print("=== All headings ===")
for h in center.find_all(['h2', 'h3', 'h4']):
    print(f"  <{h.name}> {h.get_text(strip=True)}")

# Check figures
print("\n=== Figures ===")
figs = center.find_all('figure')
print(f"  <figure> count: {len(figs)}")
# Also check for img in the content
imgs = center.find_all('img')
print(f"  <img> count: {len(imgs)}")
for img in imgs[:5]:
    src = img.get('src', '')
    print(f"    src: {src[:100]}")
