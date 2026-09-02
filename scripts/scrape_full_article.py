"""
Scrape full article content from SciOpen, including main body text.
First test with one article to verify the extraction.
"""

import requests
from bs4 import BeautifulSoup
import json
import re
import html
import time
import sqlite3
import os

BASE_URL = "https://www.sciopen.com"
DB_PATH = r'D:/Claw/JAC_Year/jac_articles.db'
OUTPUT_DIR = r'D:/Claw/JAC_Year/articles_md'

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
}

def fetch_page(url, retries=3):
    """Fetch a page with retries."""
    for attempt in range(retries):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=30)
            resp.raise_for_status()
            resp.encoding = 'utf-8'
            return resp.text
        except Exception as e:
            print(f"  Attempt {attempt+1} failed: {e}")
            if attempt < retries - 1:
                time.sleep(2)
    return None

def extract_meta_tags(soup):
    """Extract all meta tags from the page."""
    meta = {}
    
    # Single-value metas
    for name in ['citation_doi', 'citation_title', 'citation_volume', 'citation_issue',
                 'citation_firstpage', 'citation_publication_date', 'citation_online_date',
                 'citation_language', 'citation_issn', 'citation_publisher',
                 'citation_pdf_url', 'citation_abstract_html_url', 'article_references']:
        tag = soup.find('meta', attrs={'name': name})
        if tag:
            meta[name] = tag.get('content', '')
        else:
            meta[name] = ''
    
    # Multi-value metas
    meta['authors'] = [tag['content'] for tag in soup.find_all('meta', attrs={'name': 'citation_author'}) if tag.get('content')]
    meta['affiliations'] = [tag['content'] for tag in soup.find_all('meta', attrs={'name': 'citation_author_institution'}) if tag.get('content')]
    meta['keywords'] = [tag['content'] for tag in soup.find_all('meta', attrs={'name': 'citation_keywords'}) if tag.get('content')]
    
    # OG tags
    og_title = soup.find('meta', attrs={'property': 'og:title'})
    og_desc = soup.find('meta', attrs={'property': 'og:description'})
    og_url = soup.find('meta', attrs={'property': 'og:url'})
    meta['og_title'] = og_title['content'] if og_title else ''
    meta['og_description'] = og_desc['content'] if og_desc else ''
    meta['og_url'] = og_url['content'] if og_url else ''
    
    return meta

def extract_json_ld(soup):
    """Extract JSON-LD structured data."""
    for script in soup.find_all('script', type='application/ld+json'):
        try:
            data = json.loads(script.string)
            if data.get('@type') == 'ScholarlyArticle':
                return data
        except:
            continue
    return None

def extract_body_content(soup):
    """Extract the main article body content."""
    body_content = {}
    
    # 1. Abstract - try multiple selectors
    abstract_section = soup.find('div', class_=re.compile(r'abstract', re.I))
    if abstract_section:
        body_content['abstract_html'] = str(abstract_section)
        body_content['abstract_text'] = abstract_section.get_text(strip=True)
    else:
        # Try from the article body area
        abstract_header = soup.find(['h2', 'h3', 'div'], string=re.compile(r'abstract', re.I))
        if abstract_header:
            # Get the next sibling content
            next_el = abstract_header.find_next_sibling()
            if next_el:
                body_content['abstract_html'] = str(next_el)
                body_content['abstract_text'] = next_el.get_text(strip=True)
    
    # 2. Main article body - look for the article content container
    # SciOpen uses various class names
    article_body = None
    for selector in [
        'div.article-content',
        'div.article-body',
        'div.article_content',
        'div.article_body',
        'div#main-content',
        'article',
        'div.content-detail',
        'div.content_detail',
    ]:
        article_body = soup.find(selector)
        if article_body:
            break
    
    if not article_body:
        # Try to find by ID
        for id_name in ['article-content', 'article-body', 'article_content', 'main-content', 'content']:
            article_body = soup.find(id=id_name)
            if article_body:
                break
    
    if article_body:
        body_content['body_html'] = str(article_body)
        body_content['body_text'] = article_body.get_text(separator='\n', strip=True)
        
        # Extract sections (headings)
        sections = []
        for heading in article_body.find_all(['h1', 'h2', 'h3', 'h4']):
            sections.append({
                'level': int(heading.name[1]),
                'text': heading.get_text(strip=True)
            })
        body_content['sections'] = sections
    else:
        body_content['body_html'] = ''
        body_content['body_text'] = ''
        body_content['sections'] = []
    
    # 3. References
    ref_section = None
    ref_header = soup.find(['h2', 'h3', 'div'], string=re.compile(r'references?', re.I))
    if ref_header:
        ref_section = ref_header.find_next_sibling()
        if not ref_section:
            # Maybe the refs are in a parent div
            parent = ref_header.parent
            if parent:
                ref_section = parent
    
    if ref_section:
        body_content['references_html'] = str(ref_section)
        # Try to extract individual references
        refs = []
        for li in ref_section.find_all('li'):
            refs.append(li.get_text(strip=True))
        if not refs:
            # Try numbered paragraphs
            text = ref_section.get_text(separator='\n')
            refs = [r.strip() for r in re.split(r'\n\[\d+\]|\n\d+\.', text) if r.strip()]
        body_content['references_list'] = refs
    else:
        body_content['references_html'] = ''
        body_content['references_list'] = []
    
    # 4. Figures
    figures = []
    for fig in soup.find_all('figure'):
        caption = fig.find('figcaption')
        img = fig.find('img')
        figures.append({
            'caption': caption.get_text(strip=True) if caption else '',
            'img_src': img['src'] if img else '',
        })
    # Also try figure-like structures in SciOpen
    for fig_div in soup.find_all('div', class_=re.compile(r'fig|figure', re.I)):
        if fig_div not in [f for f in soup.find_all('figure')]:
            caption = fig_div.find(class_=re.compile(r'caption', re.I))
            img = fig_div.find('img')
            if img:
                figures.append({
                    'caption': caption.get_text(strip=True) if caption else fig_div.get_text(strip=True)[:200],
                    'img_src': img.get('src', ''),
                })
    body_content['figures'] = figures
    
    # 5. Tables
    tables = []
    for table in soup.find_all('table'):
        tables.append(str(table))
    body_content['tables'] = tables
    
    # 6. Statistics (views, downloads, citations)
    page_text = soup.get_text()
    stats = {}
    for stat_name, pattern in [
        ('views', r'Views?\s*[:\s]\s*(\d+)'),
        ('downloads', r'Downloads?\s*[:\s]\s*(\d+)'),
        ('crossref_cites', r'Crossref\s*[:\s]\s*(\d+)'),
        ('wos_cites', r'Web of Science\s*[:\s]\s*(\d+)'),
        ('scopus_cites', r'Scopus\s*[:\s]\s*(\d+)'),
    ]:
        match = re.search(pattern, page_text, re.I)
        stats[stat_name] = int(match.group(1)) if match else 0
    body_content['stats'] = stats
    
    # 7. Article type and dates from body
    for atype in ['Review', 'Research Article', 'Retraction Notice', 'Short Communication', 'Letter']:
        if atype in page_text:
            body_content['article_type'] = atype
            break
    
    # Extract dates from body
    date_patterns = {
        'received': r'Received\s*[:\s]\s*(\d{1,2}\s+\w+\s+\d{4})',
        'revised': r'Revised\s*[:\s]\s*(\d{1,2}\s+\w+\s+\d{4})',
        'accepted': r'Accepted\s*[:\s]\s*(\d{1,2}\s+\w+\s+\d{4})',
        'published': r'Published\s*[:\s]\s*(\d{1,2}\s+\w+\s+\d{4})',
    }
    for date_key, pattern in date_patterns.items():
        match = re.search(pattern, page_text)
        if match:
            body_content[date_key + '_date'] = match.group(1)
    
    # 8. Internal article ID
    ris_link = soup.find('a', href=re.compile(r'download_ris'))
    if ris_link:
        id_match = re.search(r'id=(\d+)', ris_link['href'])
        if id_match:
            body_content['internal_id'] = id_match.group(1)
    
    # 9. Copyright / License
    license_match = re.search(r'(CC BY[\s\w.]+4\.0|Creative Commons.*Licens[^.]+)', page_text)
    body_content['license'] = license_match.group(1) if license_match else ''
    
    return body_content

def html_to_markdown(element_text):
    """Convert basic HTML to markdown."""
    text = element_text
    text = html.unescape(text)
    # Convert headings
    text = re.sub(r'<h2[^>]*>(.*?)</h2>', r'\n## \1\n', text, flags=re.DOTALL)
    text = re.sub(r'<h3[^>]*>(.*?)</h3>', r'\n### \1\n', text, flags=re.DOTALL)
    text = re.sub(r'<h4[^>]*>(.*?)</h4>', r'\n#### \1\n', text, flags=re.DOTALL)
    # Convert bold
    text = re.sub(r'<strong[^>]*>(.*?)</strong>', r'**\1**', text, flags=re.DOTALL)
    text = re.sub(r'<b[^>]*>(.*?)</b>', r'**\1**', text, flags=re.DOTALL)
    # Convert italic
    text = re.sub(r'<em[^>]*>(.*?)</em>', r'*\1*', text, flags=re.DOTALL)
    text = re.sub(r'<i[^>]*>(.*?)</i>', r'*\1*', text, flags=re.DOTALL)
    # Convert links
    text = re.sub(r'<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>', r'[\2](\1)', text, flags=re.DOTALL)
    # Convert paragraphs
    text = re.sub(r'<p[^>]*>(.*?)</p>', r'\n\1\n', text, flags=re.DOTALL)
    # Convert line breaks
    text = re.sub(r'<br\s*/?>', '\n', text)
    # Convert lists
    text = re.sub(r'<li[^>]*>(.*?)</li>', r'- \1', text, flags=re.DOTALL)
    text = re.sub(r'<ul[^>]*>|</ul>|<ol[^>]*>|</ol>', '\n', text)
    # Convert sup/sub
    text = re.sub(r'<sup[^>]*>(.*?)</sup>', r'<sup>\1</sup>', text)
    text = re.sub(r'<sub[^>]*>(.*?)</sub>', r'<sub>\1</sub>', text)
    # Remove remaining HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Clean up whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def generate_full_markdown(meta, body, json_ld, doi):
    """Generate complete markdown with full body content."""
    lines = []
    
    # Title
    title = meta.get('citation_title', '')
    lines.append(f'# {title}')
    lines.append('')
    
    # Metadata table
    lines.append('## Metadata')
    lines.append('')
    lines.append('| Field | Value |')
    lines.append('|-------|-------|')
    lines.append(f'| **DOI** | {doi} |')
    if meta.get('citation_volume'):
        lines.append(f'| **Volume** | {meta["citation_volume"]} |')
    if meta.get('citation_issue'):
        lines.append(f'| **Issue** | {meta["citation_issue"]} |')
    if meta.get('citation_firstpage'):
        lines.append(f'| **Article Number** | {meta["citation_firstpage"]} |')
    if meta.get('citation_publication_date'):
        lines.append(f'| **Publication Date** | {meta["citation_publication_date"]} |')
    if meta.get('citation_online_date'):
        lines.append(f'| **Online Date** | {meta["citation_online_date"]} |')
    if meta.get('citation_issn'):
        lines.append(f'| **ISSN** | {meta["citation_issn"]} |')
    if meta.get('citation_publisher'):
        lines.append(f'| **Publisher** | {meta["citation_publisher"]} |')
    if meta.get('citation_language'):
        lines.append(f'| **Language** | {meta["citation_language"]} |')
    if body.get('article_type'):
        lines.append(f'| **Article Type** | {body["article_type"]} |')
    if body.get('license'):
        lines.append(f'| **License** | {body["license"]} |')
    lines.append(f'| **URL** | https://www.sciopen.com/article/{doi} |')
    if meta.get('citation_pdf_url'):
        lines.append(f'| **PDF** | {meta["citation_pdf_url"]} |')
    lines.append('')
    
    # Dates
    dates = []
    if body.get('received_date'):
        dates.append(f'| **Received** | {body["received_date"]} |')
    if body.get('revised_date'):
        dates.append(f'| **Revised** | {body["revised_date"]} |')
    if body.get('accepted_date'):
        dates.append(f'| **Accepted** | {body["accepted_date"]} |')
    if body.get('published_date'):
        dates.append(f'| **Published** | {body["published_date"]} |')
    if dates:
        lines.append('## Publication Dates')
        lines.append('')
        lines.append('| Event | Date |')
        lines.append('|-------|------|')
        lines.extend(dates)
        lines.append('')
    
    # Authors
    if meta.get('authors'):
        lines.append('## Authors')
        lines.append('')
        for i, author in enumerate(meta['authors'], 1):
            affil = meta['affiliations'][i-1] if i <= len(meta.get('affiliations', [])) else ''
            if affil:
                lines.append(f'{i}. {author} — {affil}')
            else:
                lines.append(f'{i}. {author}')
        lines.append('')
    
    # Keywords
    if meta.get('keywords'):
        lines.append('## Keywords')
        lines.append('')
        lines.append(', '.join(f'`{k}`' for k in meta['keywords']))
        lines.append('')
    
    # Abstract
    abstract_text = body.get('abstract_text', '')
    if not abstract_text:
        # Fallback to og:description
        abstract_text = html.unescape(meta.get('og_description', ''))
        abstract_text = re.sub(r'<[^>]+>', '', abstract_text)
    if abstract_text:
        lines.append('## Abstract')
        lines.append('')
        lines.append(abstract_text)
        lines.append('')
    
    # Main Body Content
    body_text = body.get('body_text', '')
    if body_text:
        lines.append('## Full Text')
        lines.append('')
        lines.append(body_text)
        lines.append('')
    
    # Figures
    if body.get('figures'):
        lines.append('## Figures')
        lines.append('')
        for i, fig in enumerate(body['figures'], 1):
            if fig.get('caption'):
                lines.append(f'**Figure {i}:** {fig["caption"]}')
            if fig.get('img_src'):
                lines.append(f'![Figure {i}]({fig["img_src"]})')
            lines.append('')
    
    # References
    if body.get('references_list'):
        lines.append('## References')
        lines.append('')
        for i, ref in enumerate(body['references_list'], 1):
            lines.append(f'{i}. {ref}')
        lines.append('')
    
    # Statistics
    stats = body.get('stats', {})
    if any(v > 0 for v in stats.values()):
        lines.append('## Statistics')
        lines.append('')
        lines.append('| Metric | Count |')
        lines.append('|--------|-------|')
        if stats.get('views', 0) > 0:
            lines.append(f'| Views | {stats["views"]} |')
        if stats.get('downloads', 0) > 0:
            lines.append(f'| Downloads | {stats["downloads"]} |')
        if stats.get('crossref_cites', 0) > 0:
            lines.append(f'| Crossref Citations | {stats["crossref_cites"]} |')
        if stats.get('wos_cites', 0) > 0:
            lines.append(f'| Web of Science Citations | {stats["wos_cites"]} |')
        if stats.get('scopus_cites', 0) > 0:
            lines.append(f'| Scopus Citations | {stats["scopus_cites"]} |')
        lines.append('')
    
    # Citation
    if meta.get('article_references'):
        lines.append('## How to Cite')
        lines.append('')
        lines.append(f'> {meta["article_references"]}')
        lines.append('')
    
    # Footer
    lines.append('---')
    lines.append('')
    lines.append(f'*Scraped from SciOpen on {time.strftime("%Y-%m-%d %H:%M:%S")}*')
    
    return '\n'.join(lines)

def test_single_article(doi):
    """Test scraping a single article."""
    url = f"{BASE_URL}/article/{doi}"
    print(f"Fetching: {url}")
    
    html_content = fetch_page(url)
    if not html_content:
        print("Failed to fetch page!")
        return None
    
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Extract everything
    meta = extract_meta_tags(soup)
    json_ld = extract_json_ld(soup)
    body = extract_body_content(soup)
    
    # Debug: print what we found
    print(f"\n=== META ===")
    print(f"Title: {meta.get('citation_title', 'N/A')}")
    print(f"Authors: {meta.get('authors', [])}")
    print(f"Keywords: {meta.get('keywords', [])}")
    print(f"Volume: {meta.get('citation_volume', 'N/A')}")
    print(f"Issue: {meta.get('citation_issue', 'N/A')}")
    print(f"PDF: {meta.get('citation_pdf_url', 'N/A')}")
    
    print(f"\n=== BODY ===")
    print(f"Article type: {body.get('article_type', 'N/A')}")
    print(f"Received: {body.get('received_date', 'N/A')}")
    print(f"Accepted: {body.get('accepted_date', 'N/A')}")
    print(f"Published: {body.get('published_date', 'N/A')}")
    print(f"Internal ID: {body.get('internal_id', 'N/A')}")
    print(f"License: {body.get('license', 'N/A')}")
    print(f"Stats: {body.get('stats', {})}")
    print(f"Abstract length: {len(body.get('abstract_text', ''))}")
    print(f"Body text length: {len(body.get('body_text', ''))}")
    print(f"Sections found: {len(body.get('sections', []))}")
    print(f"References found: {len(body.get('references_list', []))}")
    print(f"Figures found: {len(body.get('figures', []))}")
    print(f"Tables found: {len(body.get('tables', []))}")
    
    if body.get('sections'):
        print(f"\n=== SECTIONS ===")
        for s in body['sections']:
            print(f"  {'  ' * (s['level']-2)}{s['text']}")
    
    # Generate markdown
    md_content = generate_full_markdown(meta, body, json_ld, doi)
    
    # Save to file
    safe_doi = doi.replace('/', '_').replace('.', '_')
    filepath = os.path.join(OUTPUT_DIR, f'{safe_doi}.md')
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(md_content)
    print(f"\nSaved to: {filepath}")
    
    # Also save raw HTML for debugging
    debug_path = os.path.join(OUTPUT_DIR, f'{safe_doi}_debug.html')
    with open(debug_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    print(f"Debug HTML saved to: {debug_path}")
    
    return md_content

if __name__ == '__main__':
    # Test with the latest article
    test_doi = "10.26599/JAC.2026.9221301"
    test_single_article(test_doi)
