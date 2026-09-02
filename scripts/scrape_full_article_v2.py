"""
Complete article scraper - fetches full text content including body.
Workflow:
1. Fetch article page HTML (for meta tags, stats, emails, altmetric)
2. Call /article/full_text?doi=xxx (for structure + fullTextUrl)
3. Immediately fetch fullTextUrl (for contentList = body text)
4. Call /article/reference/list?doi=xxx (for references)
5. Call /article/stat?articleId=xxx (for views/downloads/citations)
6. Generate complete markdown
"""

import requests
from bs4 import BeautifulSoup
import json
import re
import html
import time
import os
import sqlite3
import sys

# Force flush output
def flush_print(*args, **kwargs):
    kwargs['flush'] = True
    print(*args, **kwargs)

BASE_URL = "https://www.sciopen.com"
DB_PATH = r'D:/Claw/JAC_Year/jac_articles.db'
OUTPUT_DIR = r'D:/Claw/JAC_Year/articles_md'

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "application/json, text/html, */*",
    "Accept-Language": "en-US,en;q=0.9",
}

def fetch_json(url, referer=None):
    h = HEADERS.copy()
    if referer:
        h["Referer"] = referer
    resp = requests.get(url, headers=h, timeout=20)
    resp.raise_for_status()
    return resp.json()

def fetch_text(url, referer=None):
    h = HEADERS.copy()
    if referer:
        h["Referer"] = referer
    resp = requests.get(url, headers=h, timeout=20)
    resp.raise_for_status()
    return resp.text

def clean_html(text):
    if not text:
        return ''
    text = html.unescape(text)
    text = re.sub(r'<[^>]+>', '', text)
    return text.strip()

def html_to_markdown_simple(html_text):
    if not html_text:
        return ''
    text = html.unescape(html_text)
    text = re.sub(r'<h1[^>]*>(.*?)</h1>', r'\n# \1\n', text, flags=re.DOTALL)
    text = re.sub(r'<h2[^>]*>(.*?)</h2>', r'\n## \1\n', text, flags=re.DOTALL)
    text = re.sub(r'<h3[^>]*>(.*?)</h3>', r'\n### \1\n', text, flags=re.DOTALL)
    text = re.sub(r'<h4[^>]*>(.*?)</h4>', r'\n#### \1\n', text, flags=re.DOTALL)
    text = re.sub(r'<strong[^>]*>(.*?)</strong>', r'**\1**', text, flags=re.DOTALL)
    text = re.sub(r'<b[^>]*>(.*?)</b>', r'**\1**', text, flags=re.DOTALL)
    text = re.sub(r'<em[^>]*>(.*?)</em>', r'*\1*', text, flags=re.DOTALL)
    text = re.sub(r'<i[^>]*>(.*?)</i>', r'*\1*', text, flags=re.DOTALL)
    text = re.sub(r'<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>', r'[\2](\1)', text, flags=re.DOTALL)
    text = re.sub(r'<p[^>]*>(.*?)</p>', r'\n\1\n', text, flags=re.DOTALL)
    text = re.sub(r'<br\s*/?>', '\n', text)
    text = re.sub(r'<li[^>]*>(.*?)</li>', r'- \1', text, flags=re.DOTALL)
    text = re.sub(r'<ul[^>]*>|</ul>|<ol[^>]*>|</ol>', '\n', text)
    text = re.sub(r'<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*/?\s*>', r'![\2](\1)', text)
    text = re.sub(r'<img[^>]*src="([^"]*)"[^>]*/?\s*>', r'![](\1)', text)
    text = re.sub(r'<sup[^>]*>(.*?)</sup>', r'<sup>\1</sup>', text)
    text = re.sub(r'<sub[^>]*>(.*?)</sub>', r'<sub>\1</sub>', text)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def extract_stats_from_page(soup):
    """Extract views, downloads, citations from article page."""
    stats = {'views': 0, 'downloads': 0, 'crossref_cites': 0, 'wos_cites': 0, 'scopus_cites': 0, 'csdc_cites': 0}
    page_text = soup.get_text()
    
    for stat_key, patterns in [
        ('views', [r'Views?\s*[:\s]\s*(\d+)']),
        ('downloads', [r'Downloads?\s*[:\s]\s*(\d+)']),
        ('crossref_cites', [r'Crossref\s*[:\s]\s*(\d+)']),
        ('wos_cites', [r'Web of Science\s*[:\s]\s*(\d+)']),
        ('scopus_cites', [r'Scopus\s*[:\s]\s*(\d+)']),
        ('csdc_cites', [r'CSCD\s*[:\s]\s*(\d+)']),
    ]:
        for pattern in patterns:
            match = re.search(pattern, page_text, re.I)
            if match:
                stats[stat_key] = int(match.group(1))
                break
    
    return stats

def extract_emails_from_page(soup):
    """Extract author emails from article page, matched by order."""
    emails = []
    
    # Method 1: mailto links in the article body (most reliable)
    for a in soup.find_all('a', href=re.compile(r'mailto:')):
        email = a['href'].replace('mailto:', '').strip()
        if email and email not in emails:
            emails.append(email)
    
    # Method 2: Look for email elements near author info
    if not emails:
        # SciOpen puts emails in specific elements near corresponding authors
        author_area = soup.find('div', class_=re.compile(r'art-authors|author', re.I))
        if author_area:
            for el in author_area.find_all(['span', 'a', 'div'], class_=re.compile(r'email|correspond', re.I)):
                text = el.get_text(strip=True)
                if '@' in text:
                    email_match = re.search(r'[\w.+-]+@[\w-]+\.[\w.]+', text)
                    if email_match:
                        email = email_match.group(0)
                        if email not in emails:
                            emails.append(email)
    
    return emails

def extract_altmetric_from_page(soup):
    """Extract Altmetric score from page."""
    altmetric_el = soup.find(class_='altmetric-embed')
    if altmetric_el:
        img = altmetric_el.find('img')
        if img and img.get('alt'):
            match = re.search(r'score of (\d+)', img['alt'])
            if match:
                return int(match.group(1))
    return 0

def extract_internal_id(soup):
    """Extract internal article ID from page."""
    ris_link = soup.find('a', href=re.compile(r'download_ris'))
    if ris_link:
        id_match = re.search(r'id=(\d+)', ris_link['href'])
        if id_match:
            return id_match.group(1)
    
    # Try from onclick handlers
    for el in soup.find_all(onclick=True):
        match = re.search(r'previewActivityPdf.*?(\d{15,})', str(el.get('onclick', '')))
        if match:
            return match.group(1)
    
    return ''

def get_stat_api(article_id, referer=None):
    """Get stats from /article/stat API."""
    if not article_id:
        return {}
    try:
        data = fetch_json(f"{BASE_URL}/article/stat?articleId={article_id}&ifPreview=false", referer=referer)
        obj = data.get('object', {})
        return {
            'views': obj.get('clickNum', 0),
            'downloads': obj.get('downloadNum', 0),
            'crossref_cites': obj.get('crossrefNum', 0) if 'crossrefNum' in obj else 0,
            'wos_cites': obj.get('wosNum', 0) if 'wosNum' in obj else 0,
            'scopus_cites': obj.get('scopusNum', 0) if 'scopusNum' in obj else 0,
        }
    except:
        return {}

def get_db_emails(doi):
    """Get author emails from the local database."""
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('SELECT corresponding_authors, corresponding_emails FROM articles WHERE doi = ?', (doi,))
        row = c.fetchone()
        conn.close()
        if row and row[1]:
            emails = [e.strip() for e in row[1].split(';') if e.strip()]
            authors = [a.strip() for a in (row[0] or '').split(';') if a.strip()]
            # Map emails to corresponding authors
            return authors, emails
    except:
        pass
    return [], []

def scrape_article(doi):
    """Scrape a complete article with full text."""
    print(f"  [1/5] Fetching article page...")
    page_url = f"{BASE_URL}/article/{doi}"
    page_html = fetch_text(page_url)
    soup = BeautifulSoup(page_html, 'html.parser')
    
    # Extract meta tags
    meta = {}
    for name in ['citation_doi', 'citation_title', 'citation_volume', 'citation_issue',
                 'citation_firstpage', 'citation_publication_date', 'citation_online_date',
                 'citation_pdf_url', 'article_references']:
        tag = soup.find('meta', attrs={'name': name})
        meta[name] = tag['content'] if tag else ''
    
    meta['authors'] = [t['content'] for t in soup.find_all('meta', attrs={'name': 'citation_author'}) if t.get('content')]
    meta['affiliations'] = [t['content'] for t in soup.find_all('meta', attrs={'name': 'citation_author_institution'}) if t.get('content')]
    meta['keywords'] = [t['content'] for t in soup.find_all('meta', attrs={'name': 'citation_keywords'}) if t.get('content')]
    
    # Extract dates from page body
    page_text = soup.get_text()
    for date_key, pattern in [
        ('received', r'Received\s*[:\s]\s*(\d{1,2}\s+\w+\s+\d{4})'),
        ('revised', r'Revised\s*[:\s]\s*(\d{1,2}\s+\w+\s+\d{4})'),
        ('accepted', r'Accepted\s*[:\s]\s*(\d{1,2}\s+\w+\s+\d{4})'),
        ('published', r'Published\s*[:\s]\s*(\d{1,2}\s+\w+\s+\d{4})'),
    ]:
        match = re.search(pattern, page_text)
        if match:
            meta[date_key + '_date'] = match.group(1)
    
    # Article type
    meta['article_type'] = ''
    for atype in ['Review', 'Research Article', 'Retraction Notice', 'Short Communication', 'Letter']:
        if atype in page_text:
            meta['article_type'] = atype
            break
    
    # Stats from page
    stats = extract_stats_from_page(soup)
    
    # Emails - try page first, then DB
    emails = extract_emails_from_page(soup)
    if not emails:
        db_corr_authors, db_emails = get_db_emails(doi)
        if db_emails:
            emails = db_emails
    
    # Altmetric
    altmetric = extract_altmetric_from_page(soup)
    
    # Internal ID
    internal_id = extract_internal_id(soup)
    
    # Get stat API data (more accurate)
    if internal_id:
        print(f"  [2/5] Fetching stat API...")
        stat_data = get_stat_api(internal_id, referer=page_url)
        # Use API data if available, otherwise keep page-scraped stats
        for k, v in stat_data.items():
            if v > 0:
                stats[k] = v
    else:
        print(f"  [2/5] No internal ID, skipping stat API...")
    
    print(f"  [3/5] Fetching full_text API...")
    ft_data = fetch_json(f"{BASE_URL}/article/full_text?doi={doi}", referer=page_url)
    ft_obj = ft_data.get('object', {})
    
    trees = ft_obj.get('trees', [])
    images = ft_obj.get('images', [])
    tables = ft_obj.get('tables', [])
    notes = ft_obj.get('notes', [])
    full_text_url = ft_obj.get('fullTextUrl', '')
    
    # Fetch contentList from fullTextUrl
    content_list = []
    if full_text_url:
        print(f"  [4/5] Fetching contentList from OSS...")
        try:
            content_data = fetch_text(full_text_url, referer=page_url)
            content_list = json.loads(content_data)
            print(f"    Got {len(content_list)} content sections")
        except Exception as e:
            print(f"    Failed to fetch contentList: {e}")
    else:
        print(f"  [4/5] No fullTextUrl available, skipping...")
    
    print(f"  [5/5] Fetching references...")
    try:
        ref_data = fetch_json(f"{BASE_URL}/article/reference/list?doi={doi}", referer=page_url)
        ref_obj = ref_data.get('object', {})
        references = ref_obj.get('referenceVOS', [])
    except Exception as e:
        print(f"    Failed to fetch references: {e}")
        references = []
    
    return generate_complete_markdown(meta, trees, content_list, images, tables, notes, references, stats, emails, altmetric, doi)

def generate_complete_markdown(meta, trees, content_list, images, tables, notes, references, stats, emails, altmetric, doi):
    """Generate complete markdown with all available content."""
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
    if meta.get('article_type'):
        lines.append(f'| **Article Type** | {meta["article_type"]} |')
    if meta.get('citation_pdf_url'):
        lines.append(f'| **PDF** | {meta["citation_pdf_url"]} |')
    lines.append(f'| **URL** | https://www.sciopen.com/article/{doi} |')
    lines.append('')
    
    # Publication Dates (only once, not duplicated with Metadata)
    dates = []
    for key in ['received', 'revised', 'accepted', 'published']:
        val = meta.get(f'{key}_date', '')
        if val:
            dates.append(f'| **{key.capitalize()}** | {val} |')
    if dates:
        lines.append('## Publication Dates')
        lines.append('')
        lines.append('| Event | Date |')
        lines.append('|-------|------|')
        lines.extend(dates)
        lines.append('')
    
    # Authors with emails
    if meta.get('authors'):
        lines.append('## Authors')
        lines.append('')
        # Build email lookup from DB corresponding authors
        email_map = {}
        db_corr_authors, db_emails_list = get_db_emails(doi)
        if db_corr_authors and db_emails_list:
            for a, e in zip(db_corr_authors, db_emails_list):
                email_map[a.strip().lower()] = e.strip()
        
        for i, author in enumerate(meta['authors'], 1):
            affil = meta['affiliations'][i-1] if i <= len(meta.get('affiliations', [])) else ''
            # Try to find email for this author (case-insensitive match)
            author_email = email_map.get(author.lower(), '')
            
            entry = f'{i}. {author}'
            if affil:
                entry += f' — {affil}'
            if author_email:
                entry += f' (📧 {author_email})'
            lines.append(entry)
        lines.append('')
    
    # Keywords
    if meta.get('keywords'):
        lines.append('## Keywords')
        lines.append('')
        lines.append(', '.join(f'`{k}`' for k in meta['keywords']))
        lines.append('')
    
    # Statistics - always show all metrics even if 0
    lines.append('## Statistics')
    lines.append('')
    lines.append('| Metric | Count |')
    lines.append('|--------|-------|')
    lines.append(f'| Views | {stats.get("views", 0)} |')
    lines.append(f'| Downloads | {stats.get("downloads", 0)} |')
    lines.append(f'| Crossref Citations | {stats.get("crossref_cites", 0)} |')
    lines.append(f'| Web of Science Citations | {stats.get("wos_cites", 0)} |')
    lines.append(f'| Scopus Citations | {stats.get("scopus_cites", 0)} |')
    lines.append(f'| CSCD Citations | {stats.get("csdc_cites", 0)} |')
    lines.append(f'| Altmetric Score | {altmetric} |')
    lines.append('')
    
    # Table of Contents
    if trees:
        lines.append('## Table of Contents')
        lines.append('')
        def print_toc(nodes, indent=0):
            for node in nodes:
                prefix = '  ' * indent
                lines.append(f'{prefix}- {node.get("label", "")} {node.get("title", "")}')
                if node.get('children'):
                    print_toc(node['children'], indent + 1)
        print_toc(trees)
        lines.append('')
    
    # Abstract - from contentList
    abstract_content = None
    for item in content_list:
        if item.get('key', '').startswith('title_-2') and 'abstract' in item.get('title', '').lower():
            abstract_content = item.get('content', '')
            break
    
    if abstract_content:
        lines.append('## Abstract')
        lines.append('')
        lines.append(html_to_markdown_simple(abstract_content))
        lines.append('')
    
    # Main Body Content
    if content_list:
        lines.append('## Full Text')
        lines.append('')
        for item in content_list:
            key = item.get('key', '')
            item_title = item.get('title', '')
            item_content = item.get('content', '')
            
            # Skip abstract (already handled) and empty sections
            if key.startswith('title_-2') and 'abstract' in item_title.lower():
                continue
            if not item_content.strip():
                continue
            
            # Determine heading level based on key pattern
            parts = key.replace('s', '').split('-')
            level = min(len(parts) + 1, 4)
            heading = '#' * level
            
            if item_title:
                lines.append(f'{heading} {item_title}')
                lines.append('')
            
            lines.append(html_to_markdown_simple(item_content))
            lines.append('')
    
    # Figures
    if images:
        lines.append('## Figures')
        lines.append('')
        for i, img in enumerate(images, 1):
            caption = img.get('label', '')
            src = img.get('html', '')
            src_match = re.search(r'src="([^"]*)"', src)
            img_url = src_match.group(1) if src_match else ''
            if caption:
                lines.append(f'**Figure {i}:** {caption}')
            if img_url:
                lines.append(f'![Figure {i}]({img_url})')
            lines.append('')
    
    # Tables
    if tables:
        lines.append('## Tables')
        lines.append('')
        for table in tables:
            label = table.get('label', '')
            parent_html = table.get('parentHtml', '')
            if label:
                lines.append(f'### {label}')
                lines.append('')
            if parent_html:
                md_table = html_table_to_markdown(parent_html)
                lines.append(md_table)
                lines.append('')
    
    # Notes
    if notes:
        lines.append('## Notes')
        lines.append('')
        for note in notes:
            note_title = note.get('title', '')
            note_content = note.get('content', '')
            if note_title:
                lines.append(f'### {note_title}')
                lines.append('')
            if note_content:
                lines.append(html_to_markdown_simple(note_content))
                lines.append('')
    
    # References
    if references:
        lines.append('## References')
        lines.append('')
        for i, ref in enumerate(references, 1):
            ref_html = ref.get('reference', '')
            ref_text = clean_html(ref_html)
            ref_doi = ref.get('doi', '')
            if ref_text:
                entry = f'{i}. {ref_text}'
                if ref_doi:
                    entry += f' https://doi.org/{ref_doi}'
                lines.append(entry)
        lines.append('')
    
    # How to Cite - clean version
    if meta.get('article_references'):
        cite = clean_html(meta['article_references'])
        # Clean up extra dots, spaces, and HTML artifacts
        cite = re.sub(r'<[^>]+>', '', cite)
        cite = re.sub(r'\.\s*\.+', '.', cite)
        cite = re.sub(r'\s*,\s*\.', ',', cite)
        cite = re.sub(r'\s+', ' ', cite).strip()
        cite = cite.rstrip('.')
        lines.append('## How to Cite')
        lines.append('')
        lines.append(f'> {cite}')
        lines.append('')
    
    # Footer
    lines.append('---')
    lines.append('')
    lines.append(f'*Scraped from SciOpen on {time.strftime("%Y-%m-%d %H:%M:%S")}*')
    
    return '\n'.join(lines)

def html_table_to_markdown(html_table):
    """Convert HTML table to markdown table."""
    soup = BeautifulSoup(html_table, 'html.parser')
    table = soup.find('table')
    if not table:
        return html_to_markdown_simple(html_table)
    
    headers = []
    thead = table.find('thead')
    if thead:
        for th in thead.find_all('th'):
            headers.append(clean_html(th.get_text()))
    
    tbody = table.find('tbody') or table
    body_rows = []
    for tr in tbody.find_all('tr'):
        cells = []
        for td in tr.find_all(['td', 'th']):
            cells.append(clean_html(td.get_text()))
        if cells and cells != headers:
            body_rows.append(cells)
    
    if not headers and body_rows:
        headers = body_rows[0]
        body_rows = body_rows[1:]
    
    if not headers:
        return ''
    
    md_lines = []
    md_lines.append('| ' + ' | '.join(headers) + ' |')
    md_lines.append('| ' + ' | '.join(['---'] * len(headers)) + ' |')
    for row in body_rows:
        while len(row) < len(headers):
            row.append('')
        md_lines.append('| ' + ' | '.join(row[:len(headers)]) + ' |')
    
    return '\n'.join(md_lines)

def test_single(doi):
    """Test with a single article."""
    print(f"\n{'='*60}")
    print(f"Scraping: {doi}")
    print(f"{'='*60}")
    
    md = scrape_article(doi)
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    safe_doi = doi.replace('/', '_').replace('.', '_')
    filepath = os.path.join(OUTPUT_DIR, f'{safe_doi}.md')
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(md)
    
    print(f"\nSaved to: {filepath}")
    print(f"Total length: {len(md)} chars")
    return md

def batch_scrape():
    """Scrape all articles from the database."""
    log_path = os.path.join(OUTPUT_DIR, 'scrape_log.txt')
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT doi FROM articles ORDER BY year, volume, issue')
    all_dois = [row[0] for row in c.fetchall()]
    conn.close()
    
    with open(log_path, 'w', encoding='utf-8') as log:
        log.write(f"Starting batch scrape of {len(all_dois)} articles at {time.strftime('%Y-%m-%d %H:%M:%S')}\n\n")
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    success = 0
    errors = 0
    skipped = 0
    
    for i, doi in enumerate(all_dois, 1):
        safe_doi = doi.replace('/', '_').replace('.', '_')
        filepath = os.path.join(OUTPUT_DIR, f'{safe_doi}.md')
        
        if os.path.exists(filepath):
            skipped += 1
            continue
        
        try:
            md = scrape_article(doi)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(md)
            success += 1
            with open(log_path, 'a', encoding='utf-8') as log:
                log.write(f"[{i}/{len(all_dois)}] OK: {doi} ({len(md)} chars)\n")
        except Exception as e:
            errors += 1
            with open(log_path, 'a', encoding='utf-8') as log:
                log.write(f"[{i}/{len(all_dois)}] ERROR: {doi} - {e}\n")
            # Don't let one failure stop the batch
            continue
        
        if success % 10 == 0 and success > 0:
            with open(log_path, 'a', encoding='utf-8') as log:
                log.write(f"--- Progress: {success} done, {errors} errors, {skipped} skipped ---\n")
        
        sys.stdout.flush()
        time.sleep(1)
    
    summary = f"\nDone! {success} scraped, {errors} errors, {skipped} skipped\nTotal: {len(all_dois)} articles"
    with open(log_path, 'a', encoding='utf-8') as log:
        log.write(summary)
    print(summary)

if __name__ == '__main__':
    batch_scrape()
