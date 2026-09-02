const initSqlJs = require('sql.js');
const fs = require('fs');
const https = require('https');

const DB_PATH = 'E:/Claw/JAC_Year/jac_articles.db';

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
  });
}

async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));
  
  // Get 3 articles from 2024 without funding
  const r = db.exec(`
    SELECT id, doi, title FROM articles 
    WHERE year = 2024 AND (funding IS NULL OR funding = '')
    ORDER BY id ASC LIMIT 3
  `);
  
  if (!r.length) { db.close(); return; }
  
  for (const row of r[0].values) {
    const id = row[0], doi = row[1], title = row[2];
    console.log(`\n=== ${id}: ${doi} ===`);
    console.log(`Title: ${title}`);
    
    // Test 1: Crossref full data
    console.log('\n[Crossref]');
    try {
      const crUrl = 'https://api.crossref.org/works/' + encodeURIComponent(doi);
      const crBody = await httpsGet(crUrl);
      const crJson = JSON.parse(crBody);
      const msg = crJson.message || {};
      
      console.log('Funder count:', msg.funder?.length || 0);
      console.log('Award count:', msg.award?.length || 0);
      
      // Look for funder/award info
      const funderInfo = [];
      if (msg.funder) {
        for (const f of msg.funder) {
          funderInfo.push(`${f.name || f['name-title']} (${f.DOI || 'no-DOI'})`);
        }
      }
      console.log('Funders:', funderInfo.join(' | '));
      
      // Also check "institutions" or "institution"
      if (msg.institution) {
        console.log('Institutions:', JSON.stringify(msg.institution));
      }
      
      // Check "author" for funding info
      if (msg.author) {
        for (const a of msg.author) {
          if (a.family && a.given) {
            // no-op
          }
        }
      }
      
    } catch (e) {
      console.log('Crossref error:', e.message);
    }
    
    // Test 2: SciOpen full_text API - check all available fields
    console.log('\n[SciOpen full_text]');
    try {
      const ftUrl = 'https://www.sciopen.com/article/full_text?doi=' + encodeURIComponent(doi);
      const ftBody = await httpsGet(ftUrl);
      const ftJson = JSON.parse(ftBody);
      const obj = ftJson.object || {};
      
      console.log('Keys:', Object.keys(obj).join(', '));
      console.log('fundingStatements:', JSON.stringify(obj.fundingStatements));
      console.log('notes:', JSON.stringify(obj.notes));
      console.log('fn:', JSON.stringify(obj.fn));
      
      // Check if notes contains any funding info
      if (obj.notes && obj.notes.length) {
        for (const note of obj.notes) {
          console.log('Note title:', note.title);
          console.log('Note content:', note.content?.replace(/<[^>]+>/g, ' ').substring(0, 200));
        }
      }
      
    } catch (e) {
      console.log('SciOpen error:', e.message);
    }
    
    await new Promise(r => setTimeout(r, 1500));
  }
  
  db.close();
}

main().catch(e => console.error(e));
