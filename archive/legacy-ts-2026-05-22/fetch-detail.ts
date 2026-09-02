/**
 * fetch-detail.ts — 爬取文章详情（funding + corresponding author）
 * 
 * 用法：npx ts-node scripts/fetch-detail.ts [--batch N] [--delay MS] [--dry-run]
 * 
 * 数据源：
 *   1. Funding Statements: /article/full_text?doi=XXX → fundingStatements[]
 *   2. Acknowledgements: 文章页 HTML → article['acknowledgement']
 *   3. Corresponding author: 文章页 HTML 内嵌 JSON → type:1 作者
 * 
 * 2026-04-27: 新增 acknowledgement 提取（98%文章有此字段）
 */

import * as fs from 'fs';
import * as https from 'https';
import initSqlJs from 'sql.js';

const DB_PATH = process.env.DB_PATH || 'E:\\Claw\\JAC_Year\\jac_articles.db';
const BATCH_SIZE = parseInt(process.argv.find(a => a.startsWith('--batch'))?.split('=')[1] || '20');
const DELAY_MS = parseInt(process.argv.find(a => a.startsWith('--delay'))?.split('=')[1] || '2000');
const DRY_RUN = process.argv.includes('--dry-run');

// ============================================================
// HTTP helpers
// ============================================================
function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/json',
      }
    }, (res) => {
      // Follow redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        return httpsGet(res.headers.location!).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ============================================================
// Fetch funding from full_text API
// ============================================================
interface FullTextResponse {
  object?: {
    fundingStatements?: string[];
    bio?: any[];
    fn?: any[];
    notes?: { title: string; content: string }[];
  };
}

async function fetchFundingStatements(doi: string): Promise<string> {
  const url = `https://www.sciopen.com/article/full_text?doi=${encodeURIComponent(doi)}`;
  try {
    const raw = await httpsGet(url);
    const json: FullTextResponse = JSON.parse(raw);
    const obj = json.object;
    if (obj?.fundingStatements && obj.fundingStatements.length > 0) {
      return obj.fundingStatements.join('\n');
    }
    return '';
  } catch (e) {
    console.log(`  [WARN] FundingStatements fetch failed for ${doi}: ${(e as Error).message}`);
    return '';
  }
}

// ============================================================
// Extract pure funding info (name + grant number) from raw text
// Removes common prefixes and returns clean grant names/numbers
// ============================================================
function extractPureFunding(raw: string): string {
  if (!raw || raw.trim().length < 10) return '';
  
  // Split by paragraph tags and line breaks
  const paragraphs = raw.split(/(?:<\/?p>|\\n|\r?\n)+/).map(s => s.trim()).filter(Boolean);
  const results: string[] = [];
  
  // Prefix -> removal pairs (applied iteratively until no change)
  const PREFIX_PATTERNS: [RegExp, string][] = [
    [/^this\s*work\s*was\s*financially\s*supported\s+by\s+/i, ''],
    [/^this\s*work\s*was\s+supported\s+by\s+/i, ''],
    [/^this\s*work\s*has\s*been\s+supported\s+by\s+/i, ''],
    [/^this\s*work\s*is\s+(?:also\s+)?supported\s+by\s+/i, ''],
    [/^this\s*work\s+(?:was\s+)?sponsored\s+by\s+/i, ''],
    [/^the\s*work\s+(?:conducted\s+at\s+\w+\s+)?(?:was\s+)?(?:also\s+)?supported\s+by\s+/i, ''],
    [/^the\s*work\s+was\s+supported\s+by\s+/i, ''],
    [/^this\s*study\s+was\s+supported\s+by\s+/i, ''],
    [/^this\s*study\s+(?:has\s*been\s+)?supported\s+by\s+/i, ''],
    [/^this\s*research\s+was\s+supported\s+by\s+/i, ''],
    [/^this\s*research\s+(?:has\s*been\s+)?supported\s+by\s+/i, ''],
    [/^this\s*research\s+(?:is\s+)?(?:also\s+)?sponsored\s+by\s+/i, ''],
    [/^this\s*research\s+sponsored\s+by\s+/i, ''],
    [/^this\s*project\s+was\s+supported\s+by\s+/i, ''],
    [/^this\s*project\s+(?:has\s*been\s+)?supported\s+by\s+/i, ''],
    [/^the\s+authors?\s+(?:thank|acknowledge)[^.]*?by\s+/i, ''],
    [/^we\s+(?:thank|acknowledge)[^.]*?by\s+/i, ''],
    [/^funding:\s*/i, ''],
    [/^acknowledgements?:\s*/i, ''],
    [/^also\s+/i, ''],
    [/^additionally\s+/i, ''],
    [/^furthermore\s+/i, ''],
  ];
  
  const FUND_AGENCIES = [
    'national natural science foundation', 'nsfc',
    'national key r&d program', 'key r&d program',
    'chinese academy of sciences', 'cas',
    'science and technology commission',
    'innovation program', 'postdoctoral science foundation',
    'young scholars', 'fundamental research',
    'provincial natural science foundation',
    'national research foundation',  // NRF Korea
    'us department of energy', 'doe',
    'european research council', 'erc',
    'deutsche forschungsgemeinschaft', 'dfg',
    'jsps kakenhi', 'jsps',
    'national science foundation',
  ];
  
  const SKIP_STARTWORDS = [
    'author contributions', 'conflict of interest', 'data availability',
    'supplementary', 'appendix', 'reference', 'doi:', 'copyright',
    'received:', 'accepted:', 'published:', 'corresponding author',
    'introduction', 'methods', 'results and discussion',
  ];
  
  for (const para of paragraphs) {
    // Remove HTML tags and escaped characters
    let cleaned = para.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    
    if (cleaned.length < 15) continue;
    
    // Skip non-funding paragraphs
    const lower = cleaned.toLowerCase();
    if (SKIP_STARTWORDS.some(w => lower.startsWith(w))) continue;
    
    // Iteratively remove prefixes
    let changed = true;
    while (changed) {
      changed = false;
      for (const [pat, replacement] of PREFIX_PATTERNS) {
        const before = cleaned;
        cleaned = cleaned.replace(pat, replacement).trim();
        if (cleaned !== before) { changed = true; break; }
      }
    }
    
    if (cleaned.length < 10) continue;
    
    // Remove leading punctuation
    cleaned = cleaned.replace(/^[\.,:\-\u2014\u2013;\s]+/, '').trim();
    // Remove trailing punctuation
    cleaned = cleaned.replace(/[.;]+$/, '').trim();
    
    if (cleaned.length < 10) continue;
    
    // Check if this looks like funding
    const lower2 = cleaned.toLowerCase();
    const hasAgency = FUND_AGENCIES.some(a => lower2.includes(a));
    
    if (hasAgency) {
      // Capitalize first letter
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      results.push(cleaned);
    }
  }
  
  return results.join('\n');
}

// ============================================================
// Fetch acknowledgement from article HTML page
// ============================================================
async function fetchAcknowledgement(doi: string): Promise<string> {
  const url = `https://www.sciopen.com/article/${doi}`;
  try {
    const html = await httpsGet(url);
    
    // Extract acknowledgement from embedded JSON
    const ackMatch = html.match(/"acknowledgement"\s*:\s*"([^"]+)"/);
    if (ackMatch && ackMatch[1].length > 10) {
      // Unescape the string (remove \/ and \n)
      const ack = ackMatch[1]
        .replace(/\\\//g, '/')
        .replace(/\\n/g, ' ')
        .replace(/\\"/g, '"')
        .replace(/<\/?p>/g, '')
        .trim();
      return ack;
    }
    return '';
  } catch (e) {
    console.log(`  [WARN] Acknowledgement fetch failed for ${doi}: ${(e as Error).message}`);
    return '';
  }
}

// ============================================================
// Fetch corresponding author from article HTML (using type:1 marker)
// ============================================================
async function fetchCorrespondingEmails(doi: string): Promise<string> {
  const url = `https://www.sciopen.com/article/${doi}`;
  try {
    const html = await httpsGet(url);
    
    // Try to find the author list JSON with type:1 (corresponding) markers
    // Pattern: "authors":[{"id":...,"name":"...","email":"...","type":1,...}]
    const authorListMatch = html.match(/"authors"\s*:\s*\[([\s\S]*?)\]\s*[,}]/);
    if (authorListMatch) {
      try {
        // Extract the authors array
        const authorsStr = '[' + authorListMatch[1] + ']';
        // Parse individual author objects
        const authorPat = /\{[^{}]*"type"\s*:\s*1[^{}]*"email"\s*:\s*"([^"]+)"[^{}]*\}/g;
        const corrAuthors: { name: string; email: string }[] = [];
        let m;
        while ((m = authorPat.exec(authorsStr)) !== null) {
          // Also try to get name
          const nameMatch = m[0].match(/"name"\s*:\s*"([^"]+)"/);
          corrAuthors.push({
            name: nameMatch ? nameMatch[1] : '',
            email: m[1]
          });
        }
        if (corrAuthors.length > 0) {
          return JSON.stringify(corrAuthors);
        }
      } catch (parseErr) {
        // Fall through to regex fallback
      }
    }
    
    // Fallback: simple regex email extraction
    const emailPat = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const exclude = ['sciopen.com', 'baidu.com', 'wqketang', 'google', 'linkedin', 'trendmd', 'altmetric', 'izhixue.cn'];
    const emails: string[] = [];
    let m;
    while ((m = emailPat.exec(html)) !== null) {
      const email = m[0].toLowerCase();
      if (!exclude.some(e => email.includes(e))) {
        if (!emails.includes(email)) {
          emails.push(email);
        }
      }
    }
    
    if (emails.length > 0) {
      return JSON.stringify(emails.map(email => ({ name: '', email })));
    }
    return '[]';
  } catch (e) {
    console.log(`  [WARN] Email fetch failed for ${doi}: ${(e as Error).message}`);
    return '[]';
  }
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log(`JAC_Year Fetch Detail`);
  console.log(`  Batch: ${BATCH_SIZE}, Delay: ${DELAY_MS}ms, Dry-run: ${DRY_RUN}`);
  
  const SQL = await initSqlJs();
  const data = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(data);
  
  // Get articles without funding
  const result = db.exec(
    `SELECT doi FROM articles WHERE funding IS NULL OR funding = '' ORDER BY doi LIMIT ${BATCH_SIZE}`
  );
  
  if (!result.length || !result[0].values.length) {
    console.log('No articles without funding. All done!');
    db.close();
    return;
  }
  
  const dois = result[0].values.map(r => r[0] as string);
  console.log(`Found ${dois.length} articles to process\n`);
  console.log(`Note: Now extracting 'acknowledgement' field (98% coverage)\n`);
  
  let success = 0;
  let withFunding = 0;
  let withEmail = 0;
  
  for (let i = 0; i < dois.length; i++) {
    const doi = dois[i];
    console.log(`[${i + 1}/${dois.length}] ${doi}`);
    
    // Fetch funding statements (from API)
    const fundingStatements = await fetchFundingStatements(doi);
    
    // Fetch acknowledgement (from HTML)
    const acknowledgement = await fetchAcknowledgement(doi);
    
    // Combine both into funding field (raw) then extract pure funding
    const rawParts: string[] = [];
    if (fundingStatements) rawParts.push(fundingStatements);
    if (acknowledgement) rawParts.push(acknowledgement);
    const rawFunding = rawParts.join('\n');
    const funding = extractPureFunding(rawFunding);
    
    if (funding) withFunding++;
    
    // Fetch corresponding author emails
    const corrJson = await fetchCorrespondingEmails(doi);
    if (corrJson !== '[]') withEmail++;
    
    // Update database
    if (!DRY_RUN) {
      if (funding) {
        db.run('UPDATE articles SET funding = ? WHERE doi = ?', [funding, doi]);
      }
      if (corrJson !== '[]') {
        db.run('UPDATE articles SET corresponding_json = ? WHERE doi = ?', [corrJson, doi]);
      }
      // Save after each article
      const exportData = db.export();
      fs.writeFileSync(DB_PATH, Buffer.from(exportData));
    }
    
    success++;
    
    // Rate limiting
    if (i < dois.length - 1) {
      await sleep(DELAY_MS);
    }
  }
  
  db.close();
  
  console.log(`\n=== Summary ===`);
  console.log(`Processed: ${success}/${dois.length}`);
  console.log(`With funding: ${withFunding}`);
  console.log(`With email: ${withEmail}`);
  console.log(`Dry-run: ${DRY_RUN ? 'Yes (no changes)' : 'No (changes saved)'}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
