/**
 * JAC_Year Funding 抓取脚本 v3
 * 
 * 从 SciOpen API 获取 Acknowledgements 数据，补充到数据库
 * 
 * 使用 Acknowledgements API (Acknowledgement 字段):
 * https://www.sciopen.com/v2/Paper/RelatedInfo?resourceId={id}
 * 
 * 特点：Acknowledgement 包含 Funding 信息，且可能比 fundingStatements 更可靠
 * 
 * 策略：
 * 1. 分批处理，每批 5 篇，间隔 3 秒
 * 2. 每批结束保存 checkpoint（last_processed_doi）
 * 3. Ctrl+C 可安全中断，不会丢失进度
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const https = require('https');

const DB_PATH = 'E:/Claw/JAC_Year/jac_articles.db';
const BATCH_SIZE = 5;
const DELAY_MS = 3000;
const CHECKPOINT_FILE = 'E:/Claw/JAC_Year/_fetch_checkpoint.txt';

// ---------- HTTPS GET ----------
function httpsGet(url, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json, text/html',
      },
      timeout: timeoutMs,
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

// ---------- 获取 paperId ----------
async function getPaperId(doi) {
  // 方法1: 从 full_text API 获取 paperId
  const url = `https://www.sciopen.com/article/full_text?doi=${encodeURIComponent(doi)}`;
  try {
    const { body } = await httpsGet(url);
    const json = JSON.parse(body);
    const paperId = json.object?.id;
    if (paperId) return paperId;
  } catch (e) {}
  
  // 方法2: 从 article page HTML 提取
  try {
    const pageUrl = `https://www.sciopen.com/article/${encodeURIComponent(doi)}`;
    const { body } = await httpsGet(pageUrl);
    const match = body.match(/resourceId["\s:]+([0-9a-f]{32,})/i);
    if (match) return match[1];
    const match2 = body.match(/paperId["\s:]+(\d+)/);
    if (match2) return match2[1];
  } catch (e) {}
  
  return null;
}

// ---------- 获取 Acknowledgements ----------
async function getAcknowledgement(paperId) {
  // 方案A: RelatedInfo API
  try {
    const url = `https://www.sciopen.com/v2/Paper/RelatedInfo?resourceId=${paperId}`;
    const { body } = await httpsGet(url);
    const json = JSON.parse(body);
    
    // 查找 Acknowledgement 或 Funding 相关内容
    const list = json.data?.list || json.data || [];
    for (const item of list) {
      const type = (item.type || item.infoType || '').toString();
      const title = (item.title || '').toString().toLowerCase();
      const content = (item.content || '').toString();
      
      if (title.includes('acknowledgement') || title.includes('funding') ||
          type.includes('acknowledgement') || type.includes('funding')) {
        return content.trim();
      }
    }
  } catch (e) {}
  
  // 方案B: 从 full_text API 直接获取 contentList
  // （需要先获取 paperId，然后拼 DOI）
  return null;
}

// ---------- 从 full_text 提取 Acknowledgements ----------
async function getAcknowledgementFromFullText(doi) {
  const url = `https://www.sciopen.com/article/full_text?doi=${encodeURIComponent(doi)}`;
  try {
    const { body } = await httpsGet(url);
    const json = JSON.parse(body);
    
    const contentList = json.object?.contentList || [];
    for (const item of contentList) {
      const type = (item.type || '').toString().toLowerCase();
      const title = (item.title || '').toString().toLowerCase();
      
      if (type.includes('acknow') || title.includes('acknow') ||
          type.includes('funding') || title.includes('funding') ||
          type.includes('reference') || title.includes('reference')) {
        continue; // skip references
      }
    }
    
    // 也检查 trees
    const trees = json.object?.trees || [];
    for (const tree of trees) {
      const title = (tree.title || '').toString().toLowerCase();
      if (title.includes('acknowledgement') || title.includes('funding')) {
        // 找到了 Acknowledgement section，需要找对应的 content
        for (const item of contentList) {
          const itemTitle = (item.title || '').toString();
          if (itemTitle.includes('Acknowledgement') || itemTitle.includes('Funding') ||
              itemTitle.includes('致谢') || itemTitle.includes('基金')) {
            return (item.content || '').trim();
          }
        }
      }
    }
    
    // 直接遍历 contentList，找所有非 reference 的文本块
    for (const item of contentList) {
      const type = (item.type || '').toString().toLowerCase();
      const title = (item.title || '').toString();
      const content = (item.content || '').toString();
      
      // 跳过 section 标题、参考文献等
      if (type === 'section' || type === 'reference' || type === 'fig' || type === 'table') continue;
      if (title && !title.match(/[a-z]{3,}/i)) continue; // 中文标题跳过
      
      // 找包含 funding 关键词的内容
      if (content.length > 100 &&
          (content.includes('Foundation') || content.includes('funding') ||
           content.includes('Grant No') || content.includes('Supported by') ||
           content.includes('Acknowledgements') || content.includes('Acknowledgment') ||
           content.includes('国家自然') || content.includes('基金'))) {
        return content.trim();
      }
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

// ---------- 主程序 ----------
async function main() {
  // 读取 checkpoint
  let lastProcessedId = null;
  if (fs.existsSync(CHECKPOINT_FILE)) {
    lastProcessedId = fs.readFileSync(CHECKPOINT_FILE, 'utf8').trim();
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  // 获取需要 funding 的文章（排除已处理的 checkpoint 之前的）
  let sql = `SELECT id, doi, title, year FROM articles 
             WHERE (funding IS NULL OR funding = '') AND year = 2024
             ORDER BY id ASC`;
  
  if (lastProcessedId) {
    sql = `SELECT id, doi, title, year FROM articles 
           WHERE (funding IS NULL OR funding = '') AND year = 2024 AND id > ${lastProcessedId}
           ORDER BY id ASC`;
  }

  const r = db.exec(sql);
  if (!r.length) {
    console.log('没有需要抓取的文章了！');
    db.close();
    return;
  }

  const articles = r[0].values.map(row => ({
    id: row[0], doi: row[1], title: row[2], year: row[3]
  }));

  console.log(`需要抓取: ${articles.length} 篇`);
  console.log(`批次大小: ${BATCH_SIZE}, 间隔: ${DELAY_MS}ms`);
  console.log(`Checkpoint: ${lastProcessedId || '从头开始'}`);
  console.log('---');

  let batchNum = 0;
  let totalSuccess = 0;
  let totalFail = 0;
  const BATCH_INTERVAL = Math.ceil(articles.length / BATCH_SIZE);

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    batchNum++;
    const batch = articles.slice(i, i + BATCH_SIZE);
    const ids = batch.map(a => a.id);
    const doilist = batch.map(a => a.doi);

    console.log(`\n批次 ${batchNum}/${BATCH_INTERVAL}: [${ids.join(', ')}]`);
    
    let batchSuccess = 0;
    let batchFail = 0;

    for (let j = 0; j < batch.length; j++) {
      const article = batch[j];
      const doi = article.doi;
      
      process.stdout.write(` ${j+1}/${batch.length} ${doi}...`);
      
      try {
        const ackText = await getAcknowledgementFromFullText(doi);
        
        if (ackText && ackText.length > 20) {
          // 保存到数据库
          const stmt = db.prepare("UPDATE articles SET funding = ? WHERE id = ?");
          stmt.bind([ackText, article.id]);
          stmt.step();
          stmt.free();
          
          // 保存 checkpoint
          fs.writeFileSync(CHECKPOINT_FILE, article.id.toString());
          
          process.stdout.write(` [${ackText.length} chars]\n`);
          batchSuccess++;
        } else {
          process.stdout.write(' no data\n');
          fs.writeFileSync(CHECKPOINT_FILE, article.id.toString());
          batchFail++;
        }
      } catch (e) {
        process.stdout.write(` ERROR: ${e.message}\n`);
        batchFail++;
      }

      // 批次内延迟
      if (j < batch.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    // 批次间延迟
    await new Promise(r => setTimeout(r, DELAY_MS));

    console.log(`本批结果: ${batchSuccess} 成功, ${batchFail} 失败`);
    totalSuccess += batchSuccess;
    totalFail += batchFail;

    // 每5批显示进度
    if (batchNum % 5 === 0) {
      const done = i + BATCH_SIZE;
      const pct = Math.round(done / articles.length * 100);
      console.log(`\n===== 进度: ${done}/${articles.length} (${pct}%) =====`);
      
      // 保存数据库
      const data = db.export();
      const buf = Buffer.from(data);
      fs.writeFileSync(DB_PATH, buf);
      console.log('数据库已保存');
    }
  }

  // 最终保存
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  
  console.log('\n===== 完成 =====');
  console.log(`总计: ${totalSuccess} 成功, ${totalFail} 失败`);
  console.log(`Checkpoint 已保存到: ${CHECKPOINT_FILE}`);
  
  // 清理 checkpoint（如果全部完成）
  if (totalFail === 0) {
    fs.unlinkSync(CHECKPOINT_FILE);
    console.log('所有文章已处理完毕，checkpoint 已清除');
  }

  db.close();
}

main().catch(e => { console.error('Fatal error:', e); process.exit(1); });
