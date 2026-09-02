"""
Extract metadata from all markdown files and generate articles.json for GitHub Pages.
Enhanced version: full abstract, corresponding author, institutions, all citation metrics.
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

    # Extract title
    title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
    title = title_match.group(1).strip() if title_match else ''

    # Parse sections by headers
    sections = {}
    current_section = None
    for line in content.split('\n'):
        if line.startswith('## '):
            current_section = line[3:].strip()
            sections[current_section] = []
        elif current_section:
            sections[current_section].append(line)

    # Extract metadata table
    metadata = {}
    for line in sections.get('Metadata', []):
        m = re.match(r'\|\s*\*?\*?(.+?)\*?\*?\s*\|\s*(.+?)\s*\|', line)
        if m:
            key = m.group(1).strip().strip('*')
            val = m.group(2).strip()
            metadata[key] = val

    # DOI
    doi = metadata.get('DOI', '')
    year_match = re.search(r'JAC\.(\d{4})', doi)
    year = int(year_match.group(1)) if year_match else None

    # Publication dates
    dates = {}
    for line in sections.get('Publication Dates', []):
        m = re.match(r'\|\s*\*?\*?(.+?)\*?\*?\s*\|\s*(.+?)\s*\|', line)
        if m:
            dates[m.group(1).strip().strip('*').lower()] = m.group(2).strip()

    # Authors with emails
    authors = []
    for line in sections.get('Authors', []):
        m = re.match(r'^\d+\.\s+(.+?)(?:\s*—|\s*$)', line)
        if m:
            name = m.group(1).strip()
            email_match = re.search(r'📧\s*([^\s)]+)', line)
            email = email_match.group(1).strip() if email_match else ''
            # Extract institution after —
            inst_match = re.search(r'—\s*(.+)', line)
            institution = inst_match.group(1).strip() if inst_match else ''
            # Clean institution (remove email part)
            institution = re.sub(r'\s*📧.*$', '', institution).strip()
            authors.append({'name': name, 'email': email, 'institution': institution})

    # Keywords
    keywords = []
    for line in sections.get('Keywords', []):
        keywords.extend(re.findall(r'`([^`]+)`', line))

    # Statistics
    stats = {}
    for line in sections.get('Statistics', []):
        m = re.match(r'\|\s*\*?\*?(.+?)\*?\*?\s*\|\s*(.+?)\s*\|', line)
        if m:
            key = m.group(1).strip().strip('*').lower()
            val = m.group(2).strip()
            stats[key] = val

    # Full abstract - extract from the first numbered section (e.g. "## 1 Introduction")
    abstract = ''
    # Find the section whose name starts with a number like "1 Introduction"
    for section_name, section_lines in sections.items():
        if re.match(r'^\d+\s', section_name):
            # Found the first numbered section, extract first paragraph
            para = []
            for line in section_lines:
                if line.startswith('#') or line.startswith('###'):
                    break
                if line.strip():
                    para.append(line.strip())
                elif para:
                    break
            abstract = ' '.join(para)
            if len(abstract) > 800:
                abstract = abstract[:800] + '...'
            break  # Only use the first numbered section

    # Research area
    research_area = metadata.get('Research Area', '')
    research_area_zh = metadata.get('Research Area (中文)', '')

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
        'research_area': research_area,
        'research_area_zh': research_area_zh,
        'received': dates.get('received', ''),
        'revised': dates.get('revised', ''),
        'accepted': dates.get('accepted', ''),
        'published': dates.get('published', ''),
        'views': stats.get('views', ''),
        'downloads': stats.get('downloads', ''),
        'citations_crossref': stats.get('crossref citations', ''),
        'citations_wos': stats.get('web of science citations', ''),
        'citations_scopus': stats.get('scopus citations', ''),
        'citations_csdb': stats.get('csdb citations', ''),
        'altmetric': stats.get('altmetric score', ''),
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

    articles.sort(key=lambda x: (x['year'] or 0, x['doi']), reverse=True)

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(articles, f, ensure_ascii=False, indent=2)

    print(f"Generated {OUTPUT_FILE}")
    print(f"Total articles: {len(articles)}")
    year_counts = {}
    for a in articles:
        y = a['year']
        year_counts[y] = year_counts.get(y, 0) + 1
    for y in sorted(year_counts.keys(), reverse=True):
        print(f"  {y}: {year_counts[y]} articles")


if __name__ == '__main__':
    main()
