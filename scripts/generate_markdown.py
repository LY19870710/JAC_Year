"""
Generate full markdown content for all articles in the database.
1. Adds a 'full_md' column to the articles table
2. Saves each article as a separate .md file in articles_md/ directory
3. Updates the database with the markdown content
"""

import sqlite3
import os
import re
import html
from pathlib import Path

DB_PATH = r'D:/Claw/JAC_Year/jac_articles.db'
OUTPUT_DIR = r'D:/Claw/JAC_Year/articles_md'

def clean_html(text):
    """Remove HTML tags and unescape entities."""
    if not text:
        return ''
    text = html.unescape(text)
    text = re.sub(r'<[^>]+>', '', text)
    return text.strip()

def sanitize_filename(doi):
    """Convert DOI to safe filename."""
    return doi.replace('/', '_').replace('.', '_')

def generate_markdown(article):
    """Generate full markdown text from article data tuple."""
    (id_, year, volume, issue, month, title, authors, affiliations, doi, type_,
     url, research_area_id, research_area, research_area_zh, created_at,
     corresponding_author, corresponding_email, corresponding_authors,
     corresponding_emails, funding, corresponding_json, institutions, email,
     category, citation, keywords, abstract, received_date, accepted_date,
     published_date) = article

    lines = []
    
    # Title
    lines.append(f'# {clean_html(title)}')
    lines.append('')
    
    # Meta info block
    lines.append('## Metadata')
    lines.append('')
    lines.append(f'| Field | Value |')
    lines.append(f'|-------|-------|')
    lines.append(f'| **DOI** | {doi} |')
    lines.append(f'| **Year** | {year} |')
    lines.append(f'| **Volume** | {volume} |')
    lines.append(f'| **Issue** | {issue} |')
    if month:
        lines.append(f'| **Month** | {month} |')
    if type_:
        lines.append(f'| **Type** | {type_} |')
    if research_area:
        lines.append(f'| **Research Area** | {research_area} |')
    if research_area_zh:
        lines.append(f'| **Research Area (中文)** | {research_area_zh} |')
    if category:
        lines.append(f'| **Category** | {category} |')
    lines.append(f'| **URL** | https://www.sciopen.com/article/{doi} |')
    lines.append(f'| **PDF** | https://www.sciopen.com/local/article_pdf/{doi}.pdf |')
    lines.append('')
    
    # Dates
    dates = []
    if received_date:
        dates.append(f'| **Received** | {received_date} |')
    if accepted_date:
        dates.append(f'| **Accepted** | {accepted_date} |')
    if published_date:
        dates.append(f'| **Published** | {published_date} |')
    if dates:
        lines.append('## Publication Dates')
        lines.append('')
        lines.append(f'| Event | Date |')
        lines.append(f'|-------|------|')
        lines.extend(dates)
        lines.append('')
    
    # Authors
    if authors:
        lines.append('## Authors')
        lines.append('')
        if ';' in authors:
            author_list = [a.strip() for a in authors.split(';') if a.strip()]
        else:
            author_list = [a.strip() for a in authors.split(',') if a.strip()]
        for i, author in enumerate(author_list, 1):
            lines.append(f'{i}. {clean_html(author)}')
        lines.append('')
    
    # Affiliations
    if affiliations:
        lines.append('## Author Affiliations')
        lines.append('')
        affil_parts = [a.strip() for a in affiliations.split(';') if a.strip()]
        for affil in affil_parts:
            lines.append(f'- {clean_html(affil)}')
        lines.append('')
    
    # Institutions
    if institutions:
        lines.append('## Institutions')
        lines.append('')
        inst_list = [i.strip() for i in institutions.split(';') if i.strip()]
        for inst in inst_list:
            lines.append(f'- {clean_html(inst)}')
        lines.append('')
    
    # Corresponding Authors
    if corresponding_authors:
        lines.append('## Corresponding Authors')
        lines.append('')
        corr_authors = [a.strip() for a in corresponding_authors.split(';') if a.strip()]
        corr_emails = [e.strip() for e in (corresponding_emails or '').split(';') if e.strip()]
        for i, author in enumerate(corr_authors):
            email = corr_emails[i] if i < len(corr_emails) else ''
            if email:
                lines.append(f'- {clean_html(author)} ({email})')
            else:
                lines.append(f'- {clean_html(author)}')
        lines.append('')
    
    # Keywords
    if keywords:
        lines.append('## Keywords')
        lines.append('')
        # Split by semicolon or comma, but handle commas inside parentheses
        if ';' in keywords:
            kw_list = [k.strip() for k in keywords.split(';') if k.strip()]
        else:
            # Split on commas not inside parentheses
            kw_list = []
            depth = 0
            current = ''
            for ch in keywords:
                if ch == '(':
                    depth += 1
                elif ch == ')':
                    depth -= 1
                if ch == ',' and depth == 0:
                    if current.strip():
                        kw_list.append(current.strip())
                    current = ''
                    continue
                current += ch
            if current.strip():
                kw_list.append(current.strip())
        lines.append(', '.join(f'`{clean_html(k)}`' for k in kw_list))
        lines.append('')
    
    # Abstract
    if abstract:
        lines.append('## Abstract')
        lines.append('')
        lines.append(clean_html(abstract))
        lines.append('')
    
    # Funding
    if funding:
        lines.append('## Funding')
        lines.append('')
        lines.append(clean_html(funding))
        lines.append('')
    
    # Citation
    if citation:
        lines.append('## Citation')
        lines.append('')
        lines.append(f'> {clean_html(citation)}')
        lines.append('')
    
    # Footer
    lines.append('---')
    lines.append('')
    lines.append(f'*Generated from JAC Year database. Record ID: {id_}, Created: {created_at}*')
    
    return '\n'.join(lines)

def main():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Add full_md column if not exists
    c.execute("PRAGMA table_info(articles)")
    columns = [col[1] for col in c.fetchall()]
    if 'full_md' not in columns:
        c.execute("ALTER TABLE articles ADD COLUMN full_md TEXT DEFAULT ''")
        conn.commit()
        print("Added 'full_md' column to articles table")
    
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Fetch all articles
    c.execute("""
        SELECT id, year, volume, issue, month, title, authors, affiliations,
               doi, type, url, research_area_id, research_area, research_area_zh,
               created_at, corresponding_author, corresponding_email,
               corresponding_authors, corresponding_emails, funding,
               corresponding_json, institutions, email, category, citation,
               keywords, abstract, received_date, accepted_date, published_date
        FROM articles
        ORDER BY year, volume, issue
    """)
    articles = c.fetchall()
    print(f"Processing {len(articles)} articles...")
    
    success = 0
    errors = 0
    
    for article in articles:
        id_ = article[0]
        doi = article[8]
        
        try:
            # Generate markdown
            md_content = generate_markdown(article)
            
            # Save to file
            safe_doi = sanitize_filename(doi)
            filepath = os.path.join(OUTPUT_DIR, f'{safe_doi}.md')
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(md_content)
            
            # Update database
            c.execute("UPDATE articles SET full_md = ? WHERE id = ?", (md_content, id_))
            success += 1
            
            if success % 50 == 0:
                conn.commit()
                print(f"  Processed {success} articles...")
                
        except Exception as e:
            print(f"  Error processing article {id_} ({doi}): {e}")
            errors += 1
    
    conn.commit()
    conn.close()
    
    print(f"\nDone! Generated {success} markdown files, {errors} errors.")
    print(f"Files saved to: {OUTPUT_DIR}")

if __name__ == '__main__':
    main()
