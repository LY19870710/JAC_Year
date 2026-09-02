import initSqlJs from 'sql.js';
import { Article, QueryFilters, StatsResult } from './types';
import * as fs from 'fs';

const DB_PATH = process.env.DB_PATH || './jac_articles.db';

let SQL: any;

export class DatabaseManager {
  private db: any;
  private initialized: boolean = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    
    SQL = await initSqlJs();
    
    // Load existing database or create new
    if (fs.existsSync(DB_PATH)) {
      try {
        const data = fs.readFileSync(DB_PATH);
        this.db = new SQL.Database(data);
      } catch (e) {
        console.log('无法读取现有数据库，创建新数据库');
        this.db = new SQL.Database();
      }
    } else {
      this.db = new SQL.Database();
    }
    
    this.createTables();
    this.migrate();
    this.initialized = true;
  }

  private createTables(): void {
    // Create table with email field (v0.3.2)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year INTEGER NOT NULL,
        title TEXT NOT NULL,
        authors TEXT NOT NULL,
        email TEXT DEFAULT '',
        affiliations TEXT,
        institutions TEXT DEFAULT '',
        doi TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        url TEXT NOT NULL,
        category TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_year ON articles(year)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_type ON articles(type)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_doi ON articles(doi)`);
  }

  private migrate(): void {
    // Check if institutions column exists
    try {
      this.db.exec(`SELECT institutions FROM articles LIMIT 1`);
    } catch (e) {
      console.log('添加 institutions �?..');
      this.db.run(`ALTER TABLE articles ADD COLUMN institutions TEXT DEFAULT ''`);
      this.save();
    }
    
    // Check if email column exists
    try {
      this.db.exec(`SELECT email FROM articles LIMIT 1`);
    } catch (e) {
      console.log('添加 email �?..');
      this.db.run(`ALTER TABLE articles ADD COLUMN email TEXT DEFAULT ''`);
      this.save();
    }

    // Check if category column exists (v0.3.4)
    try {
      this.db.exec(`SELECT category FROM articles LIMIT 1`);
    } catch (e) {
      console.log('添加 category �?..');
      this.db.run(`ALTER TABLE articles ADD COLUMN category TEXT DEFAULT ''`);
      this.save();
    }

    // Check if funding column exists (v0.4.0)
    try {
      this.db.exec(`SELECT funding FROM articles LIMIT 1`);
    } catch (e) {
      console.log('添加 funding �?..');
      this.db.run(`ALTER TABLE articles ADD COLUMN funding TEXT DEFAULT ''`);
      this.save();
    }

    // Check if volume column exists
    try {
      this.db.exec(`SELECT volume FROM articles LIMIT 1`);
    } catch (e) {
      console.log('Adding volume column...');
      this.db.run(`ALTER TABLE articles ADD COLUMN volume TEXT DEFAULT ''`);
      this.db.run(`ALTER TABLE articles ADD COLUMN issue TEXT DEFAULT ''`);
      this.save();
    }

    // Check if corresponding_json column exists (v0.4.0)
    try {
      this.db.exec(`SELECT corresponding_json FROM articles LIMIT 1`);
    } catch (e) {
      console.log('添加 corresponding_json �?..');
      this.db.run(`ALTER TABLE articles ADD COLUMN corresponding_json TEXT DEFAULT ''`);
      this.save();
    }

    // Check if citation column exists (v0.4.2)
    try {
      this.db.exec(`SELECT citation FROM articles LIMIT 1`);
    } catch (e) {
      console.log('添加 citation �?..');
      this.db.run(`ALTER TABLE articles ADD COLUMN citation TEXT DEFAULT ''`);
      this.save();
    }
  }

  private save(): void {
    const data = this.db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }

  insertArticle(article: Article): void {
    const sql = `
      INSERT OR REPLACE INTO articles 
      (year, title, authors, affiliations, institutions, doi, type, url, category, funding, corresponding_json, citation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    this.db.run(sql, [
      article.year,
      article.title,
      article.authors,
      article.affiliations,
      article.institutions || '',
      article.doi,
      article.type,
      article.url,
      article.category || '',
      article.funding || '',
      article.corresponding_json || '',
      this.makeCitation(article)
    ]);
    this.save();
  }

  updateInstitutions(doi: string, institutions: string): void {
    const sql = `UPDATE articles SET institutions = ? WHERE doi = ?`;
    this.db.run(sql, [institutions, doi]);
    this.save();
  }

  updateEmail(doi: string, email: string): void {
    const sql = `UPDATE articles SET email = ? WHERE doi = ?`;
    this.db.run(sql, [email, doi]);
    this.save();
  }

  // v0.4.0: 更新 funding 字段
  updateFunding(doi: string, funding: string): void {
    const sql = `UPDATE articles SET funding = ? WHERE doi = ?`;
    this.db.run(sql, [funding, doi]);
    this.save();
  }

  // v0.4.0: 更新通讯作者JSON
  updateCorrespondingJson(doi: string, corrJson: string): void {
    const sql = `UPDATE articles SET corresponding_json = ? WHERE doi = ?`;
    this.db.run(sql, [corrJson, doi]);
    this.save();
  }

  // v0.4.2: 更新引用格式
  updateCitation(doi: string, citation: string): void {
    const sql = `UPDATE articles SET citation = ? WHERE doi = ?`;
    this.db.run(sql, [citation, doi]);
    this.save();
  }

  // v0.4.2: 批量生成引用格式
  generateAllCitations(): number {
    const articles = this.queryArticles({}, 10000);
    let count = 0;
    for (const a of articles) {
      const citation = this.makeCitation(a);
      this.updateCitation(a.doi, citation);
      count++;
    }
    return count;
  }

  // v0.4.2: 构造单条引用
  /**
   * 生成引用格式 (v0.4.4)
   * 格式: Li Y, Zhang M, Chen J, et al. Title. Journal of Advanced Ceramics, 2025, 14(10): 9221158. https://doi.org/...
   * JAC 标准: 最多3位作者 + et al. (超出3位时)
   * 作者缩写: Haowei Lu -> Lu H
   */
  makeCitation(article: Article): string {
    const raw = article.authors.replace(/\.+$/, '').trim();
    const parts = raw.split(',').map(p => p.trim()).filter(Boolean);
    
    // 转换全名为缩写格式: "Haowei Lu" -> "Lu H"
    const abbreviateName = (name: string): string => {
      const tokens = name.trim().split(/\s+/);
      if (tokens.length < 2) return name;
      const lastName = tokens[tokens.length - 1];
      const initials = tokens.slice(0, -1).map(t => t[0].toUpperCase()).join('');
      return `${lastName} ${initials}`;
    };
    
    const abbreviatedParts = parts.map(abbreviateName);
    
    let authors: string;
    if (abbreviatedParts.length > 3) {
      authors = abbreviatedParts.slice(0, 3).join(', ') + ', et al';
    } else {
      authors = abbreviatedParts.join(', ');
    }

    const journal = 'Journal of Advanced Ceramics';
    const url = article.doi.startsWith('10.') ? `https://doi.org/${article.doi}` : article.url;
    const vol = article.volume || '';
    const iss = article.issue || '';
    const artNum = article.doi.replace(/^10\.26599\/JAC\.\d{4}\.?/, '').replace(/^\d+\(/, '').replace(/\)$/, '');
    const volPart = vol ? (iss ? `, ${vol}(${iss}): ${artNum}` : `, ${vol}: ${artNum}`) : '';
    return `${authors}. ${article.title}. ${journal}, ${article.year}${volPart}. ${url}`;
  }

  // v0.3.3: 清空无用的 email 列（出版社邮箱，通讯作者邮箱已在 corresponding_json）
  clearEmailColumn(): void {
    const sql = `UPDATE articles SET email = ''`;
    this.db.run(sql);
    this.save();
  }

  getArticlesWithoutInstitutions(): {doi: string, affiliations: string}[] {
    const sql = `SELECT doi, affiliations FROM articles WHERE institutions IS NULL OR institutions = ''`;
    const result = this.db.exec(sql);
    if (!result.length) return [];
    
    const columns = result[0].columns;
    return result[0].values.map((row: any[]) => ({
      doi: row[columns.indexOf('doi')],
      affiliations: row[columns.indexOf('affiliations')]
    }));
  }

  getArticlesWithoutEmail(): {doi: string, url: string}[] {
    const sql = `SELECT doi, url FROM articles WHERE email IS NULL OR email = ''`;
    const result = this.db.exec(sql);
    if (!result.length) return [];
    
    const columns = result[0].columns;
    return result[0].values.map((row: any[]) => ({
      doi: row[columns.indexOf('doi')],
      url: row[columns.indexOf('url')]
    }));
  }

  queryArticles(filters: QueryFilters, limit: number = 100): Article[] {
    let sql = 'SELECT * FROM articles WHERE 1=1';
    const params: any[] = [];

    if (filters.year) {
      sql += ' AND year = ?';
      params.push(filters.year);
    }

    if (filters.type) {
      sql += ' AND type = ?';
      params.push(filters.type);
    }

    if (filters.doi) {
      sql += ' AND doi LIKE ?';
      params.push(`%${filters.doi}%`);
    }

    if (filters.author) {
      sql += ' AND authors LIKE ?';
      params.push(`%${filters.author}%`);
    }

    if (filters.affiliation) {
      sql += ' AND (affiliations LIKE ? OR institutions LIKE ?)';
      params.push(`%${filters.affiliation}%`, `%${filters.affiliation}%`);
    }

    if (filters.keyword) {
      sql += ' AND (title LIKE ? OR authors LIKE ?)';
      params.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
    }

    // v0.5.0: 按研究方向筛选（使用 research_area_zh）
    if (filters.category) {
      sql += ' AND research_area_zh = ?';
      params.push(filters.category);
    }

    sql += ' ORDER BY year DESC, doi DESC LIMIT ?';
    params.push(limit);

    const result = this.db.exec(sql, params);
    if (!result.length) return [];
    
    const columns = result[0].columns;
    return result[0].values.map((row: any[]) => {
      const article: any = {};
      columns.forEach((col: string, idx: number) => {
        article[col] = row[idx];
      });
      return article as Article;
    });
  }

  getStats(): StatsResult {
    const totalResult = this.db.exec('SELECT COUNT(*) as total FROM articles');
    const total = totalResult[0]?.values[0][0] || 0;

    const byType: Record<string, number> = {};
    const typeResult = this.db.exec('SELECT type, COUNT(*) as count FROM articles GROUP BY type');
    if (typeResult.length) {
      typeResult[0].values.forEach((row: any[]) => {
        byType[row[0]] = row[1];
      });
    }

    // v0.5.0: 研究方向统计（使用 research_area_zh）
    const byCategory: Record<string, number> = {};
    const catResult = this.db.exec('SELECT research_area_zh, COUNT(*) as count FROM articles WHERE research_area_zh IS NOT NULL AND research_area_zh != "" GROUP BY research_area_zh ORDER BY count DESC');
    if (catResult.length) {
      catResult[0].values.forEach((row: any[]) => {
        byCategory[row[0]] = row[1];
      });
    }

    const byYear: Record<number, number> = {};
    const yearResult = this.db.exec('SELECT year, COUNT(*) as count FROM articles GROUP BY year ORDER BY year');
    if (yearResult.length) {
      yearResult[0].values.forEach((row: any[]) => {
        byYear[row[0]] = row[1];
      });
    }

    const instCount: Record<string, number> = {};
    const instResult = this.db.exec(`
      SELECT institutions FROM articles 
      WHERE institutions IS NOT NULL AND institutions != ''
    `);
    if (instResult.length) {
      instResult[0].values.forEach((row: any[]) => {
        row[0].split(';').forEach((inst: string) => {
          inst = inst.trim();
          if (inst) instCount[inst] = (instCount[inst] || 0) + 1;
        });
      });
    }

    const topAffiliations = Object.entries(instCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    return { total, byType, byCategory, byYear, topAffiliations };
  }

  // v0.4.4: 导出为 RIS 格式（Endnote 导入）
  /**
   * 将单篇文章转换为 RIS 格式
   * RIS 是 Endnote 支持的导入格式
   */
  toRIS(article: Article): string {
    const lines: string[] = [];
    
    // TY - 文献类型
    const typeMap: Record<string, string> = {
      'Article': 'JOUR',
      'Review': 'RPRT',
      'Letter': 'JOUR',
      'Editorial': 'JOUR'
    };
    lines.push(`TY  - ${typeMap[article.type] || 'JOUR'}`);
    
    // TI - 标题
    lines.push(`TI  - ${article.title}`);
    
    // AU - 作者（每行一个）
    const authors = article.authors.split(',').map(a => a.trim()).filter(Boolean);
    authors.forEach(author => {
      lines.push(`AU  - ${author}`);
    });
    
    // PY - 出版年份
    lines.push(`PY  - ${article.year}`);
    
    // JO - 期刊名
    lines.push(`JO  - Journal of Advanced Ceramics`);
    
    // VL - 卷
    if (article.volume) lines.push(`VL  - ${article.volume}`);
    // IS - 期
    if (article.issue) lines.push(`IS  - ${article.issue}`);
    
    // DO - DOI
    if (article.doi) lines.push(`DO  - ${article.doi}`);
    
    // UR - URL
    if (article.url) lines.push(`UR  - ${article.url}`);
    
    // AB - 摘要
    if ((article as any).abstract) {
      lines.push(`AB  - ${(article as any).abstract}`);
    }
    
    // C1 - 机构
    if (article.institutions) {
      const insts = article.institutions.split(';').map(i => i.trim()).filter(Boolean);
      insts.forEach(inst => lines.push(`C1  - ${inst}`));
    }
    
    // ER - 结束
    lines.push(`ER  - `);
    
    return lines.join('\n');
  }

  // v0.4.4: 按 ID 获取单篇文章
  getArticleById(id: number): Article | undefined {
    const result = this.db.exec('SELECT * FROM articles WHERE id = ?', [id]);
    if (!result.length || !result[0].values.length) return undefined;
    const columns = result[0].columns;
    const row = result[0].values[0];
    const article: any = {};
    columns.forEach((col: string, idx: number) => { article[col] = row[idx]; });
    return article as Article;
  }

  // v0.4.0: 导出文章（支持 CSV/XLSX/JSON）
  exportArticles(filters: QueryFilters, limit: number = 10000): Article[] {
    const sql = `
      SELECT year, title, authors, affiliations, institutions, doi, type, url, volume, issue, category, funding, corresponding_json, citation, corresponding_author, corresponding_authors, corresponding_emails, abstract, keywords, received_date, accepted_date, published_date, research_area_id, research_area, research_area_zh
      FROM articles WHERE 1=1
    `;
    const params: any[] = [];
    const condSQL: string[] = [];

    if (filters.year) { condSQL.push('year = ?'); params.push(filters.year); }
    if (filters.type) { condSQL.push('type = ?'); params.push(filters.type); }
    if (filters.author) { condSQL.push('authors LIKE ?'); params.push(`%${filters.author}%`); }
    if (filters.affiliation) { condSQL.push('(affiliations LIKE ? OR institutions LIKE ?)'); params.push(`%${filters.affiliation}%`, `%${filters.affiliation}%`); }
    if (filters.keyword) { condSQL.push('(title LIKE ? OR authors LIKE ?)'); params.push(`%${filters.keyword}%`, `%${filters.keyword}%`); }
    if (filters.category) { condSQL.push('category = ?'); params.push(filters.category); }
    if (filters.doi) { condSQL.push('doi LIKE ?'); params.push(`%${filters.doi}%`); }

    let fullSql = sql;
    if (condSQL.length) fullSql += ' AND ' + condSQL.join(' AND ');
    fullSql += ' ORDER BY year DESC, doi DESC LIMIT ?';
    params.push(limit);

    const result = this.db.exec(fullSql, params);
    if (!result.length) return [];
    const columns = result[0].columns;
    return result[0].values.map((row: any[]) => {
      const article: any = {};
      columns.forEach((col: string, idx: number) => { article[col] = row[idx]; });
      return article as Article;
    });
  }

  // v0.4.0: 统计待爬 funding 的文章
  getArticlesWithoutFunding(): { doi: string, url: string }[] {
    const sql = `SELECT doi, url FROM articles WHERE funding IS NULL OR funding = ''`;
    const result = this.db.exec(sql);
    if (!result.length) return [];
    const columns = result[0].columns;
    return result[0].values.map((row: any[]) => ({
      doi: row[columns.indexOf('doi')],
      url: row[columns.indexOf('url')]
    }));
  }

  getYears(): number[] {
    const result = this.db.exec('SELECT DISTINCT year FROM articles ORDER BY year DESC');
    if (!result.length) return [];
    return result[0].values.map((row: any[]) => row[0]);
  }

  close(): void {
    if (this.db) {
      this.save();
      this.db.close();
    }
  }
}

export { DatabaseManager as Database };
