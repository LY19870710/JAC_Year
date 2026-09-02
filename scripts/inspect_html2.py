"""Inspect the article body area in detail."""
import re
from bs4 import BeautifulSoup

html = open(r'D:/Claw/JAC_Year/articles_md/10_26599_JAC_2026_9221301_debug.html', 'r', encoding='utf-8').read()
soup = BeautifulSoup(html, 'html.parser')

# Find the main center area
center = soup.find('div', class_='v4-art-main-center')
if center:
    print("=== v4-art-main-center found ===")
    # Print direct children classes
    for child in center.find_all(recursive=False):
        cls = child.get('class', [])
        print(f"  Tag: {child.name}, Class: {cls}, ID: child.get('id', '')")
        # Show first 200 chars
        text = child.get_text(strip=True)[:200]
        if text:
            print(f"    Text preview: {text}...")
    
    print("\n=== v4-art-main-left (body content) ===")
    left = center.find('div', class_='v4-art-main-left')
    if left:
        for child in left.find_all(recursive=False)[:10]:
            cls = child.get('class', [])
            text = child.get_text(strip=True)[:150]
            print(f"  Tag: {child.name}, Class: {cls}")
            print(f"    Text: {text}...")
            print()
    
    print("\n=== v4-art-content-p elements ===")
    paragraphs = center.find_all('div', class_='v4-art-content-p')
    print(f"Found {len(paragraphs)} content paragraphs")
    for i, p in enumerate(paragraphs[:5]):
        text = p.get_text(strip=True)[:200]
        print(f"  [{i}] {text}...")
    
    print("\n=== v4-art-abstract ===")
    abstract = center.find('div', class_='v4-art-abstract')
    if abstract:
        print(f"  Text: {abstract.get_text(strip=True)[:300]}...")
    
    print("\n=== References area ===")
    ref_area = soup.find(id='article_references')
    if ref_area:
        print(f"  Found #article_references")
        refs = ref_area.find_all('div', class_='content-item')
        print(f"  Content items: {len(refs)}")
        if refs:
            print(f"  First ref: {refs[0].get_text(strip=True)[:200]}")
    else:
        # Try other ref patterns
        for div in soup.find_all(id=re.compile(r'ref', re.I)):
            print(f"  Found id={div.get('id')}")
    
    print("\n=== Right sidebar (v4-art-main-right) ===")
    right = center.find('div', class_='v4-art-main-right')
    if right:
        for child in right.find_all(recursive=False)[:15]:
            cls = child.get('class', [])
            text = child.get_text(strip=True)[:100]
            print(f"  Tag: {child.name}, Class: {cls}, Text: {text}")
