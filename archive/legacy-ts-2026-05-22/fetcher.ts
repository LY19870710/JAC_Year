import { chromium, Browser, Page } from 'playwright';
import { Article, ArticleType } from './types';
import { DatabaseManager } from './database';
import { extractInstitutions } from './institution';

const JAC_ARCHIVE_URL = 'https://www.sciopen.com/journal/join_journal/archive';
const JAC_JOURNAL_ID = '1396776045425197058';
const JAC_ISSN = '2226-4108';

export class JACFetcher {
  private browser: Browser | null = null;
  private db: DatabaseManager;

  constructor() {
    this.db = new DatabaseManager();
  }

  async init(): Promise<void> {
    await this.db.init();
  }

  async fetchYear(year: number): Promise<number> {
    console.log(`Fetching articles for year ${year}...`);
    
    const url = `${JAC_ARCHIVE_URL}?journalId=${JAC_JOURNAL_ID}&volume=${year}&issn=${JAC_ISSN}`;
    
    this.browser = await chromium.launch({ headless: true });
    const page = await this.browser.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(5000);
      
      const articles = await this.extractArticles(page, year);
      
      let count = 0;
      for (const article of articles) {
        try {
          this.db.insertArticle(article);
          count++;
        } catch (err) {
          console.log(`  Skip duplicate: ${article.doi}`);
        }
      }
      
      console.log(`  Saved ${count} articles`);
      return count;
      
    } finally {
      await this.browser?.close();
    }
  }

  private async extractArticles(page: Page, year: number): Promise<Article[]> {
    const articles = await page.evaluate((year: number) => {
      const results: any[] = [];
      const seen = new Set<string>();
      
      const links = document.querySelectorAll('a[href*="10."]');
      
      links.forEach(link => {
        const href = link.getAttribute('href') || '';
        const doiMatch = href.match(/10\.\d{4,}\/[^\s<>"']+/);
        if (!doiMatch) return;
        
        const doi = doiMatch[0];
        if (seen.has(doi)) return;
        seen.add(doi);
        
        let container = link.closest('div[class*="item"], div[class*="card"], div[class*="article"], li');
        if (!container) container = link.parentElement;
        
        let title = link.textContent?.trim() || '';
        if (title.length < 10) {
          const titleEl = container?.querySelector('h3, h4, .title, [class*="title"]');
          title = titleEl?.textContent?.trim() || '';
        }
        
        if (title.length < 10) return;
        
        let authors = '';
        const authorEl = container?.querySelector('[class*="author"], .authors');
        if (authorEl) {
          authors = authorEl.textContent?.trim() || '';
        }
        
        let affiliations = '';
        const affEl = container?.querySelector('[class*="affil"], [class*="institution"]');
        if (affEl) {
          affiliations = affEl.textContent?.trim() || '';
        }
        
        let type: ArticleType = 'Research Article';
        const typeEl = container?.querySelector('[class*="type"], .badge, .tag');
        if (typeEl) {
          const typeText = typeEl.textContent?.trim() || '';
          const validTypes = ['Research Article', 'Review', 'Editorial', 'Erratum', 'Perspective', 'Rapid Communication', 'Technical Paper'];
          if (validTypes.includes(typeText)) {
            type = typeText as ArticleType;
          }
        }
        
        results.push({
          year,
          title,
          authors,
          affiliations,
          doi,
          type,
          url: `https://www.sciopen.com/article/${doi}`
        });
      });
      
      return results;
    }, year);
    
    return (articles as Article[]).map(article => ({
      ...article,
      institutions: extractInstitutions(article.affiliations)
    }));
  }

  close(): void {
    this.db.close();
  }
}

// CLI usage
if (require.main === module) {
  const year = parseInt(process.argv[2]) || new Date().getFullYear();
  const fetcher = new JACFetcher();
  
  fetcher.init().then(() => {
    return fetcher.fetchYear(year);
  }).then(count => {
    console.log(`\nTotal: ${count} articles fetched for ${year}`);
    fetcher.close();
  }).catch(err => {
    console.error('Error:', err);
    fetcher.close();
    process.exit(1);
  });
}
