import { DatabaseManager } from '../src/database';
import { extractInstitutions } from '../src/institution';

async function migrate() {
  console.log('初始化数据库...');
  const db = new DatabaseManager();
  await db.init();
  
  // 获取所有文章
  const articles = db.queryArticles({}, 500);
  
  console.log(`开始重新提取机构，共 ${articles.length} 篇文章...`);
  
  let count = 0;
  for (const article of articles) {
    if (article.affiliations) {
      const institutions = extractInstitutions(article.affiliations);
      db.updateInstitutions(article.doi, institutions);
      count++;
    }
  }
  
  console.log(`✅ 重新提取完成: ${count} 篇`);
  
  // 显示新的机构统计
  const stats = db.getStats();
  console.log('\n新的 Top 10 机构:');
  stats.topAffiliations.slice(0, 10).forEach((inst: { name: string; count: number }, i: number) => {
    console.log(`  ${i+1}. ${inst.name} (${inst.count})`);
  });
  
  db.close();
}

migrate().catch(err => {
  console.error('错误:', err);
  process.exit(1);
});
