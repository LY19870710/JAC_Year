"""
Extract metadata from all markdown files and generate articles.json for GitHub Pages.
"""
import json
import os
import re
from pathlib import Path

INPUT_DIR = r'D:/Claw/JAC_Year/articles_md'
OUTPUT_FILE = r'D:/Claw/JAC_Year/articles_md/articles.json'


def parse_markdown_metadata(filepath):
    """Parse a markdown file and extract metadata."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract title (first # heading)
    title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
    title = title_match.group(1).strip() if title_match else ''
    
    # Extract metadata table values
    metadata = {}
    table_pattern = re.compile(r'\|\s*\*?\*?(.+?)\*?\*?\s*\|\s*(.+?)\s*\|')
    in_metadata = False
    in_dates = False
    in_stats = False
    
    for line in content.split('\n'):
        if '## Metadata' in line:
            in_metadata = True
            continue
        if '## Publication Dates' in line:
            in_metadata = False
            in_dates = True
            continue
        if '## Authors' in line:
            in_dates = False
            continue
        if '## Keywords' in line:
            continue
        if '## Statistics' in line:
            in_stats = True
            continue
        if '## ' in line and in_stats:
            in_stats = False
        
        if in_metadata or in_dates or in_stats:
            m = table_pattern.match(line)
            if m:
                key = m.group(1).strip().strip('*')
                value = m.group(2).strip()
                if in_dates:
                    key = f"date_{key.lower()}"
                if in_stats:
                    key = f"stat_{key.lower()}"
                metadata[key] = value
    
    # Extract year from DOI or metadata
    doi = metadata.get('DOI', '')
    year_match = re.search(r'JAC\.(\d{4})', doi)
    year = int(year_match.group(1)) if year_match else None
    
    # Extract article number from DOI
    article_num_match = re.search(r'JAC\.\d{4}\.(\d+)', doi)
    article_num = article_num_match.group(1) if article_num_match else ''
    
    # Extract authors
    authors = []
    in_authors = False
    for line in content.split('\n'):
        if '## Authors' in line:
            in_authors = True
            continue
        if in_authors and line.startswith('## '):
            break
        if in_authors:
            author_match = re.match(r'^\d+\.\s+(.+?)(?:\s*—|\s*$)', line)
            if author_match:
                author_name = author_match.group(1).strip()
                # Check for email
                email_match = re.search(r'📧\s*(.+)', line)
                email = email_match.group(1).strip() if email_match else ''
                authors.append({'name': author_name, 'email': email})
    
    # Extract keywords
    keywords = []
    in_keywords = False
    for line in content.split('\n'):
        if '## Keywords' in line:
            in_keywords = True
            continue
        if in_keywords and line.startswith('## '):
            break
        if in_keywords:
            kws = re.findall(r'`([^`]+)`', line)
            keywords.extend(kws)
    
    # Extract abstract
    abstract = ''
    abstract_start = content.find('## Abstract')
    if abstract_start == -1:
        # Try to find first section after metadata block
        abstract_start = content.find('## Full Text')
    if abstract_start > 0:
        # Find the first paragraph after ## Full Text or similar
        text_after = content[abstract_start:]
        # Get text after the heading
        lines_after = text_after.split('\n')[1:]
        para_lines = []
        for line in lines_after:
            if line.startswith('#') or line.startswith('## '):
                break
            if line.strip():
                para_lines.append(line.strip())
            elif para_lines:
                break
        abstract = ' '.join(para_lines)[:500]  # First 500 chars
    
    # Build article object
    article = {
        'doi': doi,
        'title': title,
        'year': year,
        'volume': metadata.get('Volume', ''),
        'issue': metadata.get('Issue', ''),
        'type': metadata.get('Article Type', metadata.get('Type', '')),
        'url': metadata.get('URL', ''),
        'pdf': metadata.get('PDF', ''),
        'authors': authors,
        'keywords': keywords,
        'abstract': abstract,
        'research_area': metadata.get('Research Area', ''),
        'research_area_zh': metadata.get('Research Area (中文)', ''),
        'received': metadata.get('date_Received', ''),
        'accepted': metadata.get('date_Accepted', ''),
        'published': metadata.get('date_Published', ''),
        'views': metadata.get('stat_Views', ''),
        'downloads': metadata.get('stat_Downloads', ''),
        'citations': metadata.get('stat_Crossref Citations', metadata.get('stat_Web of Science Citations', '')),
    }
    
    return article


def main():
    md_files = sorted(Path(INPUT_DIR).glob('*.md'))
    articles = []
    
    for md_file in md_files:
        try:
            article = parse_markdown_metadata(md_file)
            if article['title'] and article['doi']:
                articles.append(article)
        except Exception as e:
            print(f"Error parsing {md_file.name}: {e}")
    
    # Sort by year descending, then by DOI
    articles.sort(key=lambda x: (x['year'] or 0, x['doi']), reverse=True)
    
    # Write JSON
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(articles, f, ensure_ascii=False, indent=2)
    
    print(f"Generated {OUTPUT_FILE}")
    print(f"Total articles: {len(articles)}")
    
    # Print year distribution
    year_counts = {}
    for a in articles:
        y = a['year']
        year_counts[y] = year_counts.get(y, 0) + 1
    for y in sorted(year_counts.keys(), reverse=True):
        print(f"  {y}: {year_counts[y]} articles")


if __name__ == '__main__':
    main()
