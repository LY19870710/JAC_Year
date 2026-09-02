/**
 * 数据回填脚本 - v0.3.1
 * 为已有文章提取 institutions 字段
 */

import { DatabaseManager } from '../src/database';
import { extractInstitutions } from '../src/institution';

async function migrate() {
  const db = new DatabaseManager();
  await db.init();
  
  console.log('开始数据迁移...\n');
  
  try {
    const articles = db.getArticlesWithoutInstitutions();
    console.log(`找到 ${articles.length} 篇需要迁移的文章`);
    
    let success = 0;
    let failed = 0;
    
    for (const article of articles) {
      try {
        const institutions = extractInstitutions(article.affiliations);
        db.updateInstitutions(article.doi, institutions);
        
        success++;
        if (success % 10 === 0) {
          console.log(`  已处理 ${success}/${articles.length} 篇...`);
        }
      } catch (err) {
        console.error(`  失败: ${article.doi}`, err);
        failed++;
      }
    }
    
    console.log(`\n✅ 迁移完成: ${success} 成功, ${failed} 失败`);
    
  } catch (err) {
    console.error('迁移出错:', err);
  } finally {
    db.close();
  }
}

migrate();
