import express from 'express';
import path from 'path';
import * as XLSX from 'xlsx';
import { Database } from './database';
import type { QueryFilters, Article } from './types';
import { CATEGORIES } from './types';
import { fetchBatchFunding, FetchProgress } from './funding-fetcher';

const app = express();
const db = new Database();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.urlencoded({ extended: true }));

// Basic security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Home - Search page
app.get('/', async (req, res) => {
  const years = await db.getYears();
  res.render('index', { years, categories: CATEGORIES });
});

// Search results
app.get('/search', async (req, res) => {
  const filters: QueryFilters = {
    year: req.query.year ? parseInt(req.query.year as string) : undefined,
    author: req.query.author as string,
    affiliation: req.query.affiliation as string,
    type: req.query.type as any,
    doi: req.query.doi as string,
    keyword: req.query.keyword as string,
    category: req.query.category as string       // v0.3.4
  };

  const articles = await db.queryArticles(filters, 1000);
  const years = await db.getYears();

  res.render('search', { articles, filters, years, categories: CATEGORIES, count: articles.length });
});

// Statistics
app.get('/stats', async (req, res) => {
  const stats = await db.getStats();
  res.render('stats', { stats, categories: CATEGORIES });
});

// ============================================================
// v0.4.0: Export API
// 支持 CSV / XLSX / JSON 格式导出
// ============================================================
app.get('/api/export', async (req, res) => {
  const format = (req.query.format as string) || 'csv';
  if (!['csv', 'xlsx', 'json'].includes(format)) {
    return res.status(400).json({ error: '支持 csv/xlsx/json 格式' });
  }

  const filters: QueryFilters = {
    year: req.query.year ? parseInt(req.query.year as string) : undefined,
    author: req.query.author as string,
    affiliation: req.query.affiliation as string,
    type: req.query.type as any,
    keyword: req.query.keyword as string,
    category: req.query.category as string,
    doi: req.query.doi as string
  };

  const articles = db.exportArticles(filters, 10000);

  // 转换为平面记录（通讯作者JSON展开）
  const rows = articles.map(a => {
    let corrEmails = '';
    let corrNames = '';
    if (a.corresponding_json) {
      try {
        const parsed = JSON.parse(a.corresponding_json);
        // 清理HTML标签: <a href='...'>Name</a> -> Name
        const cleanName = (name: string) => name.replace(/<[^>]+>/g, '').trim();
        corrNames = parsed.map((p: any) => p.name).filter(Boolean).map(cleanName).join('; ');
        corrEmails = parsed.map((p: any) => p.email).filter(Boolean).join('; ');
      } catch (e) { /* ignore */ }
    }
    return {
      '研究方向': a.research_area_zh || a.category || '',
      'Publication Year': a.year,
      'Volume': a.volume || '',
      'Issue': a.issue || '',
      '标题': a.title,
      '类型': a.type,
      '作者': a.authors,
      '摘要': a.abstract || '',
      '关键词': a.keywords || '',
      '引用格式': a.citation || '',
      '通讯作者': corrNames || a.corresponding_authors || a.corresponding_author || '',
      '通讯邮箱': corrEmails || a.corresponding_emails || '',
      '机构（简化）': (() => {
        if (a.institutions) return a.institutions;
        if (a.affiliations) {
          try {
            const parsed = JSON.parse(a.affiliations);
            // 提取机构名，去除邮编和逗号分隔的冗余
            const clean = (s: string) => s.replace(/,\s*\d{4,6}/g, '').replace(/^[^,]+,\s*/, '').trim();
            return parsed.map(clean).filter(Boolean).join('; ');
          } catch (e) { return a.affiliations; }
        }
        return '';
      })(),
      'URL': a.url,
      '资助信息': a.funding || '',
      'Received': a.received_date || '',
      'Accepted': a.accepted_date || '',
      'Published': a.published_date || ''
    };
  });

  if (format === 'json') {
    res.setHeader('Content-Disposition', `attachment; filename="jac_articles.json"`);
    return res.json({ total: rows.length, articles: rows });
  }

  if (format === 'xlsx') {
    const ws = XLSX.utils.json_to_sheet(rows);
    // 设置列宽 (18列)
    const colWidths = [
      { wch: 18 }, // 研究方向
      { wch: 10 }, // Publication Year
      { wch: 8 },  // Volume
      { wch: 8 },  // Issue
      { wch: 60 }, // 标题
      { wch: 10 }, // 类型
      { wch: 40 }, // 作者
      { wch: 80 }, // 摘要
      { wch: 30 }, // 关键词
      { wch: 55 }, // 引用格式
      { wch: 25 }, // 通讯作者
      { wch: 30 }, // 通讯邮箱
      { wch: 35 }, // 机构
      { wch: 40 }, // URL
      { wch: 50 }, // 资助信息
      { wch: 12 }, // Received
      { wch: 12 }, // Accepted
      { wch: 12 }  // Published
    ];
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'JAC Articles');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="jac_articles_${Date.now()}.xlsx"`);
    return res.send(buf);
  }

  // CSV
  if (!rows.length) {
    return res.status(200).send('无数据');
  }
  const headers = Object.keys(rows[0]);
  const csvRows = [
    '\uFEFF' + headers.join(','),
    ...rows.map((row: Record<string, any>) =>
      headers.map(h => {
        const val = String(row[h] ?? '');
        // 包围含逗号/引号的字段
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(',')
    )
  ];
  res.setHeader('Content-Type', 'text/csv; charset=utf-8-sig');
  res.setHeader('Content-Disposition', `attachment; filename="jac_articles_${Date.now()}.csv"`);
  res.send(csvRows.join('\n'));
});

// ============================================================
// v0.4.4: RIS 导出 API（Endnote 导入）
// ============================================================
app.get('/api/export-ris', async (req, res) => {
  const idsParam = req.query.ids as string;
  const filters: QueryFilters = {};

  let articles: Article[];

  if (idsParam) {
    // 指定 ID 列表导出
    const ids = idsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    articles = ids.map(id => db.getArticleById(id)).filter((a): a is Article => a !== undefined);
  } else {
    // 按过滤条件导出
    filters.year = req.query.year ? parseInt(req.query.year as string) : undefined;
    filters.author = req.query.author as string;
    filters.affiliation = req.query.affiliation as string;
    filters.type = req.query.type as any;
    filters.keyword = req.query.keyword as string;
    filters.category = req.query.category as string;
    filters.doi = req.query.doi as string;
    articles = db.exportArticles(filters, 10000);
  }

  if (!articles.length) {
    return res.status(200).send('无数据');
  }

  // 生成 RIS
  const risContent = articles.map(a => db.toRIS(a)).join('\n\n');
  
  res.setHeader('Content-Type', 'application/x-research-info-systems');
  res.setHeader('Content-Disposition', `attachment; filename="jac_articles_${Date.now()}.ris"`);
  res.send(risContent);
});

// ============================================================
// v0.4.1: Funding Fetch — 爬取资助信息
// ============================================================
app.post('/api/fetch-funding', async (req, res) => {
  const batchSize = parseInt(req.query.batch as string) || 20;
  
  // 检查还有多少文章没有 funding
  const pendingArticles = db.getArticlesWithoutFunding();
  
  if (pendingArticles.length === 0) {
    return res.json({ 
      success: true, 
      message: '所有文章已有 funding 信息',
      pending: 0 
    });
  }
  
  // 执行批量抓取
  const results: FetchProgress[] = [];
  
  const { processed, withFunding, errors } = await fetchBatchFunding(
    db,
    batchSize,
    (progress) => {
      results.push(progress);
      console.log(`[${progress.current}/${progress.total}] ${progress.doi} - ${progress.success ? 'OK' : 'FAIL'}`);
    }
  );
  
  res.json({
    success: true,
    message: `完成 ${processed} 篇文章的 funding 抓取`,
    stats: {
      processed,
      withFunding,
      errors,
      pendingRemaining: pendingArticles.length - processed
    },
    details: results
  });
});

// ============================================================
// v0.4.2: Citation API
// ============================================================
app.post('/api/citations/generate', async (req, res) => {
  const count = db.generateAllCitations();
  res.json({ success: true, message: `已生成 ${count} 条引用格式` });
});

app.get('/api/citation/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const articles = db.queryArticles({}, 10000);
  const article = articles.find(a => a.id === id);
  if (!article) return res.status(404).json({ error: '文章不存在' });
  res.json({ citation: article.citation || db.makeCitation(article) });
});

// API - JSON endpoints
app.get('/api/articles', async (req, res) => {
  const filters: QueryFilters = {
    year: req.query.year ? parseInt(req.query.year as string) : undefined,
    author: req.query.author as string,
    type: req.query.type as any
  };

  const articles = await db.queryArticles(filters, 500);
  res.json(articles);
});

app.get('/api/stats', async (req, res) => {
  const stats = await db.getStats();
  res.json(stats);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).send('404 - Page Not Found');
});

// Initialize database and start server
async function start() {
  const isDev = process.env.NODE_ENV !== 'production';
  const PORT = parseInt(process.env.PORT || '3000');
  const HOST = process.env.HOST || '0.0.0.0';  // 0.0.0.0 = accept external connections

  await db.init();

  // v0.4.2: 启动时自动补充缺失的 citation
  const allArticles = db.queryArticles({}, 10000);
  const cited = allArticles.filter(a => a.citation).length;
  if (cited < allArticles.length) {
    db.generateAllCitations();
    console.log(`[v0.4.2] 引用格式: ${cited} → ${allArticles.length} 条`);
  }

  console.log(`JAC Year Manager starting on http://${HOST === '0.0.0.0' ? 'all interfaces' : HOST}:${PORT}`);

  const server = app.listen(PORT, HOST, () => {
    if (isDev) {
      console.log(`  Local:   http://localhost:${PORT}`);
    }
    console.log(`  Network: http://${HOST}:${PORT}`);
  });

  // Graceful shutdown — save DB before exit
  const shutdown = (signal: string) => {
    console.log(`\n[${signal}] Closing database...`);
    db.close();
    server.close(() => {
      console.log('[OK] Server closed.');
      process.exit(0);
    });
    // Force exit after 5s
    setTimeout(() => {
      console.error('[WARN] Forced exit.');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
