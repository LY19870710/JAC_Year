// add-article.ts - 手动添加文章到数据库
import { DatabaseManager } from '../src/database';

const newArticle = {
  year: 2025,
  title: 'Carbon nanofibers with small-sized Co nanoparticles and structural defects via a confined-coordination growth strategy toward electromagnetic wave absorption',
  authors: 'Wu Q, Ma Z, Wang C, et al.',
  email: '',
  affiliations: '',
  institutions: '',
  doi: '10.26599/JAC.2025.9221210',
  type: 'Research Article',
  url: 'https://doi.org/10.26599/JAC.2025.9221210',
  category: '',
  funding: '',
  corresponding_json: ''
};

async function main() {
  const db = new DatabaseManager();
  await db.init();

  // 检查是否已存在
  const existing = db.queryArticles({ doi: newArticle.doi }, 1);
  if (existing.length > 0) {
    console.log(`❌ 文章已存在: ${existing[0].title}`);
    process.exit(0);
  }

  // 直接执行 SQL 插入
  const sql = `
    INSERT OR REPLACE INTO articles 
    (year, title, authors, email, affiliations, institutions, doi, type, url, category, funding, corresponding_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  (db as any).db.run(sql, [
    newArticle.year,
    newArticle.title,
    newArticle.authors,
    newArticle.email,
    newArticle.affiliations,
    newArticle.institutions,
    newArticle.doi,
    newArticle.type,
    newArticle.url,
    newArticle.category,
    newArticle.funding,
    newArticle.corresponding_json
  ]);
  (db as any).save();

  console.log(`✅ 已添加: ${newArticle.title}`);
  console.log(`   DOI: ${newArticle.doi}`);
  console.log(`   作者: ${newArticle.authors}`);
}

main().catch(err => {
  console.error('❌ 错误:', err);
  process.exit(1);
});