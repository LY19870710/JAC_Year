// Test pure funding extraction
const SQL = require('sql.js');
const fs = require('fs');

function extractPureFunding(raw) {
  if (!raw || raw.trim().length < 10) return '';
  
  // Split by paragraph tags AND sentence boundaries
  const paragraphs = raw.split(/(?:<\/?p>|\\n|\r?\n)+/).map(s => s.trim()).filter(Boolean);
  const results = [];
  
  // Prefix -> removal pairs (applied iteratively)
  const PREFIX_PATTERNS = [
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
    'us department of energy', 'doe',
    'european research council', 'erc',
    'deutsche forschungsgemeinschaft', 'dfg',
    'jsps kakenhi',
    'national science foundation',
    'national research foundation',  // NRF Korea
  ];
  
  const SKIP_STARTWORDS = [
    'author contributions', 'conflict of interest', 'data availability',
    'supplementary', 'appendix', 'reference', 'doi:', 'copyright',
    'received:', 'accepted:', 'published:', 'corresponding author',
    'introduction', 'methods', 'results', 'discussion',
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
    
    // Remove leading punctuation/colons/semicolons
    cleaned = cleaned.replace(/^[\.,:\-\u2014\u2013;\s]+/, '').trim();
    // Remove trailing punctuation
    cleaned = cleaned.replace(/[.;]+$/, '').trim();
    
    if (cleaned.length < 10) continue;
    
    // Check if this looks like funding
    const lower2 = cleaned.toLowerCase();
    const hasAgency = FUND_AGENCIES.some(a => lower2.includes(a));
    
    if (hasAgency) {
      results.push(cleaned);
    }
  }
  
  return results.join('\n');
}

async function test() {
  const SQLMod = await SQL();
  const db = new SQLMod.Database(fs.readFileSync('E:\\Claw\\JAC_Year\\jac_articles.db'));
  const r = db.exec('SELECT doi, funding FROM articles WHERE funding IS NOT NULL AND funding != "" LIMIT 5');
  
  if (!r.length || !r[0].values) {
    console.log('No funding data found');
    return;
  }
  
  r[0].values.forEach(row => {
    console.log('='.repeat(60));
    console.log('DOI:', row[0]);
    console.log('ORIGINAL:');
    console.log(row[1]);
    console.log('\nEXTRACTED:');
    const extracted = extractPureFunding(row[1]);
    console.log(extracted || '(empty)');
    console.log();
  });
}

test().catch(console.error);
