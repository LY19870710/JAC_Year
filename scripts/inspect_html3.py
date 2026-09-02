"""Deep inspect the article body structure."""
from bs4 import BeautifulSoup
import re

html = open(r'D:/Claw/JAC_Year/articles_md/10_26599_JAC_2026_9221301_debug.html', 'r', encoding='utf-8').read()
soup = BeautifulSoup(html, 'html.parser')

center = soup.find('div', class_='art-html-center')
if not center:
    print("art-html-center not found!")
    exit()

print("=== Full structure of art-html-center ===\n")

def print_tree(el, indent=0):
    """Print the DOM tree structure."""
    tag_info = f"<{el.name}"
    if el.get('class'):
        tag_info += f" class=\"{' '.join(el['class'])}\""
    if el.get('id'):
        tag_info += f" id=\"{el['id']}\""
    tag_info += ">"
    
    text = ''
    if el.name in ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'a', 'li', 'td', 'th', 'figcaption']:
        text = el.get_text(strip=True)[:100]
    
    prefix = "  " * indent
    print(f"{prefix}{tag_info}")
    if text:
        print(f"{prefix}  → {text}")
    
    for child in el.find_all(recursive=False):
        if child.name in ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'section', 'figure', 'table', 'ul', 'ol', 'span', 'img']:
            print_tree(child, indent + 1)

print_tree(center)

print("\n\n=== References section ===")
# Look for references in various ways
ref_container = soup.find(id='article_references')
if ref_container:
    print(f"article_references found, text: {ref_container.get_text(strip=True)[:200]}")
    # Check children
    for child in ref_container.find_all(recursive=False):
        print(f"  Child: <{child.name}> class={child.get('class')} text={child.get_text(strip=True)[:100]}")

# Try looking for reference list items
ref_items = soup.find_all('div', class_=re.compile(r'ref', re.I))
print(f"\nDivs with 'ref' in class: {len(ref_items)}")
for item in ref_items[:3]:
    print(f"  {item.get('class')}: {item.get_text(strip=True)[:100]}")

# Look for numbered references in text
all_text = center.get_text(separator='\n')
lines = [l.strip() for l in all_text.split('\n') if l.strip()]
# Find lines starting with numbers that look like references
for line in lines:
    if re.match(r'^\d+\.\s+\w', line) and len(line) > 30:
        print(f"Possible ref: {line[:150]}")
