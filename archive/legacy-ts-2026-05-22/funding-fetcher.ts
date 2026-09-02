/**
 * funding-fetcher.ts — Funding 抓取模块
 * 
 * 从 sciopen.com 抓取文章资助信息
 * 支持 API 调用和批量处理
 */

import * as https from 'https';
import { DatabaseManager } from './database';

const DELAY_MS = 2000; // 请求间隔，避免被封

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
// Extract pure funding info
// ============================================================
function extractPureFunding(raw: string): string {
  if (!raw || raw.trim().length < 10) return '';
  
  const paragraphs = raw.split(/(?:<\/?p>|\\n|\r?\n)+/).map(s => s.trim()).filter(Boolean);
  const results: string[] = [];
  
  const PREFIX_PATTERNS: [RegExp, string][] = [
    // 感谢类
    [/^[\s\w]*(?:are|is|were|was)\s+deeply\s+thankful\s+for\s+(?:the\s+)?(?:financial\s+)?support\s+(?:from|of)\s+/i, ''],
    [/^[\s\w]*(?:are|is|were|was)\s+thankful\s+for\s+(?:the\s+)?(?:financial\s+)?support\s+(?:from|of)\s+/i, ''],
    [/^[\s\w]*(?:are|is|were|was)\s+grateful\s+(?:to|for)\s+(?:the\s+)?/i, ''],
    [/^[\s\w]*(?:would\s+like\s+to\s+)?(?:thank|acknowledge)\s+/i, ''],
    [/^[\s\w]*(?:express(?:es)?\s+)?(?:their\s+)?gratitude\s+(?:to|for)\s+/i, ''],
    
    // 支持/资助类
    [/^(?:financial\s+)?support\s+(?:from|of|by)\s+/i, ''],
    [/^(?:this\s+)?(?:work|study|research|project|paper)\s+(?:was|is|were|are)\s+(?:financially\s+)?(?:supported|financed|funded|sponsored)\s+(?:by|from|through)\s+/i, ''],
    [/^(?:this\s+)?(?:work|study|research|project|paper)\s+(?:was|is|were|are)\s+(?:also\s+)?(?:supported|financed|funded|sponsored)\s+(?:by|from|through)\s+/i, ''],
    [/^(?:the\s+)?(?:work|study|research|project)\s+(?:conducted\s+at\s+[\w\s]+\s+)?(?:was|is|were|are)\s+(?:also\s+)?(?:supported|financed|funded|sponsored)\s+(?:by|from|through)\s+/i, ''],
    [/^(?:the\s+)?present\s+(?:work|study|research|project|paper)\s+(?:was|is|were|are)\s+(?:financially\s+)?(?:supported|financed|funded|sponsored)\s+(?:by|from|through)\s+/i, ''],
    
    // 作者声明类
    [/^[\s\w]*acknowledge[s]?\s+/i, ''],
    [/^[\s\w]*appreciate[s]?\s+/i, ''],
    
    // 其他前缀
    [/^also\s+/i, ''],
    [/^additionally\s+/i, ''],
    [/^furthermore\s+/i, ''],
    [/^moreover\s+/i, ''],
    [/^in\s+addition\s+/i, ''],
    
    // 标签类
    [/^(?:funding|acknowledgements?|acknowledgments?):\s*/i, ''],
  ];
  
  const FUND_AGENCIES = [
    'national natural science foundation', 'nsfc',
    'national key r&d program', 'key r&d program',
    'chinese academy of sciences', 'cas',
    'science and technology commission',
    'innovation program', 'postdoctoral science foundation',
    'young scholars', 'fundamental research',
    'provincial natural science foundation',
    'national research foundation',
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
    let cleaned = para.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleaned.length < 15) continue;
    
    const lower = cleaned.toLowerCase();
    if (SKIP_STARTWORDS.some(w => lower.startsWith(w))) continue;
    
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
    cleaned = cleaned.replace(/^[\.,:\-\u2014\u2013;\s]+/, '').trim();
    cleaned = cleaned.replace(/[.;]+$/, '').trim();
    // 修复 Unicode 转义: R\u0026D → R&D, \uFB01 → fi
    cleaned = cleaned.replace(/\\u0026/g, '&');
    cleaned = cleaned.replace(/\\uFB01/gi, 'fi');
    if (cleaned.length < 10) continue;
    
    const lower2 = cleaned.toLowerCase();
    const hasAgency = FUND_AGENCIES.some(a => lower2.includes(a));
    
    if (hasAgency) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      results.push(cleaned);
    }
  }
  
  return results.join('\n');
}

// ============================================================
// Fetch acknowledgement from article HTML
// ============================================================
async function fetchAcknowledgement(doi: string): Promise<string> {
  const url = `https://www.sciopen.com/article/${doi}`;
  try {
    const html = await httpsGet(url);
    const ackMatch = html.match(/"acknowledgement"\s*:\s*"([^"]+)"/);
    if (ackMatch && ackMatch[1].length > 10) {
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
// Main fetch function for a single article
// ============================================================
export async function fetchArticleFunding(doi: string): Promise<{ funding: string; raw: string }> {
  const fundingStatements = await fetchFundingStatements(doi);
  const acknowledgement = await fetchAcknowledgement(doi);
  
  const rawParts: string[] = [];
  if (fundingStatements) rawParts.push(fundingStatements);
  if (acknowledgement) rawParts.push(acknowledgement);
  const rawFunding = rawParts.join('\n');
  const funding = extractPureFunding(rawFunding);
  
  return { funding, raw: rawFunding };
}

// ============================================================
// Batch fetch with progress callback
// ============================================================
export interface FetchProgress {
  total: number;
  current: number;
  doi: string;
  success: boolean;
  hasFunding: boolean;
}

export async function fetchBatchFunding(
  db: DatabaseManager,
  batchSize: number = 20,
  onProgress?: (progress: FetchProgress) => void
): Promise<{ processed: number; withFunding: number; errors: number }> {
  const articles = db.getArticlesWithoutFunding();
  const toProcess = articles.slice(0, batchSize);
  
  let processed = 0;
  let withFunding = 0;
  let errors = 0;
  
  for (let i = 0; i < toProcess.length; i++) {
    const { doi, url } = toProcess[i];
    
    try {
      const { funding } = await fetchArticleFunding(doi);
      
      if (funding) {
        db.updateFunding(doi, funding);
        withFunding++;
      } else {
        // Mark as checked but no funding, to avoid re-processing
        db.updateFunding(doi, '[]');
      }
      
      processed++;
      
      if (onProgress) {
        onProgress({
          total: toProcess.length,
          current: i + 1,
          doi,
          success: true,
          hasFunding: !!funding
        });
      }
      
      if (i < toProcess.length - 1) {
        await sleep(DELAY_MS);
      }
      
    } catch (e) {
      errors++;
      processed++;
      
      if (onProgress) {
        onProgress({
          total: toProcess.length,
          current: i + 1,
          doi,
          success: false,
          hasFunding: false
        });
      }
    }
  }
  
  return { processed, withFunding, errors };
}
