/**
 * JAC_Year Funding 抓取脚本 v4
 * 
 * 关键发现：
 * - full_text API 返回的 fullTextUrl 才是真正的全文 JSON
 * - 全文 JSON 的 numeric keys 是各 sub-sections，包含 Acknowledgements
 * - fundingStatements 始终为空（需要登录）
 * 
 * 策略：
 * 1. 调用 full_text API，取 fullTextUrl
 * 2. 调用 fullTextUrl，获取所有 sections 的 content
 * 3. 查找包含 Funding/Acknowledgements/Funding 的 sub-section
 * 4. 同时检查 notes 字段
 * 5. 优先用 notes['Declaration of competing interest'] 排除无 funding 的情况
 * 6. 分批处理：每批5篇，间隔2秒
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const https = require('https');

const DB_PATH = 'E:/Claw/JAC_Year/jac_articles.db';
const BATCH_SIZE = 5;
const DELAY_BETWEEN_REQUESTS = 800;  // ms between API calls
const DELAY_BETWEEN_BATCHES = 2000;  // ms between batches
const CHECKPOINT = 'E:/Claw/JAC_Year/_fetch_ack_v4_checkpoint.txt';

function httpsGet(url, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/html, */*',
        'Referer': 'https://www.sciopen.com/',
      }
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        res.resume();
        return resolve(httpsGet(res.headers.location, timeoutMs));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('TIMEOUT')); });
  });
}

function extractFunding(body) {
  // body is the raw response from fullTextUrl
  // It could be JSON or HTML
  try {
    const json = JSON.parse(body);
    // JSON with numeric keys
    const sections = [];
    for (const key of Object.keys(json).sort((a, b) => Number(a) - Number(b))) {
      const item = json[key];
      if (typeof item !== 'object' || !item) continue;
      const title = String(item.title || '');
      const content = String(item.content || '');
      sections.push({ title, content });
    }
    
    // Find acknowledgement/funding sections
    for (const s of sections) {
      const title = s.title.toLowerCase();
      if (title.includes('acknowledgement') || title.includes('funding') ||
          title.includes('致谢') || title.includes('基金')) {
        // Clean HTML from content
        const clean = s.content.replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ').replace(/&gt;/g, '>')
          .replace(/&lt;/g, '<').replace(/&amp;/g, '&')
          .replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
        if (clean.length > 30) {
          return clean;
        }
      }
    }
    
    // Not found as separate section, look in content for funding keywords
    for (const s of sections) {
      const content = s.content;
      // Skip very short content (likely section headers only)
      if (content.length < 100) continue;
      // Skip reference sections
      if (s.title.toLowerCase().includes('reference')) continue;
      
      const cleanContent = content.replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      
      // Check for funding keywords
      if ((cleanContent.includes('Foundation') && cleanContent.includes('Grant')) ||
          cleanContent.includes('Acknowledgement') || cleanContent.includes('Funding Statement') ||
          cleanContent.includes('致谢') || cleanContent.includes('基金支持') ||
          cleanContent.includes('Supported by') || cleanContent.includes('financed by')) {
        return cleanContent;
      }
    }
    
    return null;
  } catch (e) {
    // Not JSON, try HTML
    return null;
  }
}

async function fetchFunding(doi) {
  try {
    // Step 1: get full_text API
    const ftUrl = 'https://www.sciopen.com/article/full_text?doi=' + encodeURIComponent(doi);
    const ft = await httpsGet(ftUrl);
    const ftJson = JSON.parse(ft.body);
    const obj = ftJson.object || {};
    
    const fullTextUrl = obj.fullTextUrl;
    if (!fullTextUrl) {
      return { doi, success: false, reason: 'no_fullTextUrl' };
    }
    
    // Step 2: get full text
    const ft2 = await httpsGet(fullTextUrl);
    if (ft2.body.length < 500) {
      return { doi, success: false, reason: 'empty_fullText' };
    }
    
    // Step 3: extract funding
    const funding = extractFunding(ft2.body);
    
    if (funding && funding.length > 20) {
      return { doi, success: true, funding };
    } else {
      return { doi, success: false, reason: 'no_funding_found' };
    }
  } catch (e) {
    return { doi, success: false, reason: e.message };
  }
}

async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));
  
  // Load checkpoint
  let lastId = 0;
  if (fs.existsSync(CHECKPOINT)) {
    const saved = parseInt(fs.readFileSync(CHECKPOINT, 'utf8').trim(), 10);
    if (!isNaN(saved)) lastId = saved;
  }
  
  // Get articles needing funding
  const r = db.exec(
    `SELECT id, doi, title, year FROM articles 
     WHERE (funding IS NULL OR funding = '') AND year = 2024 AND id > ${lastId}
     ORDER BY id ASC`
  );
  
  if (!r.length) {
    // Also check 2025
    const r2 = db.exec(
      `SELECT id, doi, title, year FROM articles 
       WHERE (funding IS NULL OR funding = '') AND year = 2025 AND id > ${lastId}
       ORDER BY id ASC`
    );
    if (!r2.length) {
      console.log('All articles have funding, or checkpoint is at the end!');
      db.close();
      return;
    }
    r.push(...r2);
  }
  
  const articles = r[0].values.map(row => ({ id: row[0], doi: row[1], title: row[2], year: row[3] }));
  console.log(`Need to fetch: ${articles.length} articles (after id ${lastId})`);
  console.log(`Batch: ${BATCH_SIZE}, delay: ${DELAY_BETWEEN_REQUESTS}ms per request`);
  console.log('---');
  
  let done = 0, success = 0, fail = 0;
  const total = articles.length;
  
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const isNewBatch = (i % BATCH_SIZE === 0);
    const isBatchEnd = (i % BATCH_SIZE === BATCH_SIZE - 1);
    
    if (isNewBatch && i > 0) {
      // Save checkpoint between batches
      const data = db.export();
      fs.writeFileSync(DB_PATH, Buffer.from(data));
      process.stdout.write(`\n[Batch saved] `);
      await new Promise(r => setTimeout(r, DELAY_BETWEEN_BATCHES));
    }
    
    process.stdout.write(`${i + 1}/${total} ${article.doi}...`);
    
    const result = await fetchFunding(article.doi);
    
    if (result.success) {
      // Save to DB
      const stmt = db.prepare("UPDATE articles SET funding = ? WHERE id = ?");
      stmt.bind([result.funding, article.id]);
      stmt.step();
      stmt.free();
      
      // Update checkpoint
      fs.writeFileSync(CHECKPOINT, article.id.toString());
      lastId = article.id;
      
      process.stdout.write(` [${result.funding.length} chars]\n`);
      success++;
    } else {
      process.stdout.write(` [${result.reason}]\n`);
      // Still save checkpoint so we don't retry failed ones endlessly
      fs.writeFileSync(CHECKPOINT, article.id.toString());
      lastId = article.id;
      fail++;
    }
    
    done++;
    
    // Delay between requests
    if (!isBatchEnd && i < articles.length - 1) {
      await new Promise(r => setTimeout(r, DELAY_BETWEEN_REQUESTS));
    }
  }
  
  // Final save
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  
  console.log(`\n\n===== 完成 =====`);
  console.log(`总计: ${done} 篇 | 成功: ${success} | 失败: ${fail}`);
  console.log(`Checkpoint: id=${lastId}`);
  
  if (fail === 0 && success > 0) {
    fs.unlinkSync(CHECKPOINT);
    console.log('所有文章已处理完毕，checkpoint 已清除');
  }
  
  db.close();
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
