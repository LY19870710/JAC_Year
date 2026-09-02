/**
 * fetch-2024-funding.ts — 批量抓取 2024 年文章的 funding 信息
 * 
 * 用法: npx ts-node scripts/fetch-2024-funding.ts [batchSize]
 */

import { DatabaseManager } from '../src/database';
import { fetchBatchFunding } from '../src/funding-fetcher';

const DEFAULT_BATCH = 20;

async function main() {
  const batchSize = parseInt(process.argv[2]) || DEFAULT_BATCH;
  
  const db = new DatabaseManager();
  await db.init();
  
  // 获取 2024 年没有 funding 的文章
  const pending = db.getArticlesWithoutFunding();
  const total = pending.length;
  
  if (total === 0) {
    console.log('✅ 所有文章已有 funding 信息');
    db.close();
    process.exit(0);
  }
  
  console.log(`\n📊 2024 年待抓取 funding: ${total} 篇文章`);
  console.log(`⚙️  每批 ${batchSize} 篇\n`);
  
  let totalWithFunding = 0;
  let totalErrors = 0;
  let batchNum = 0;
  let currentIndex = 0;
  
  while (currentIndex < total) {
    batchNum++;
    const remaining = total - currentIndex;
    const currentBatchSize = Math.min(batchSize, remaining);
    
    console.log(`\n🔄 批次 ${batchNum}: 第 ${currentIndex + 1}-${currentIndex + currentBatchSize} 篇`);
    
    const results: any[] = [];
    let batchSuccess = 0;
    let batchErrors = 0;
    let batchHasFunding = 0;
    
    const { processed, withFunding, errors } = await fetchBatchFunding(
      db,
      currentBatchSize,
      (progress) => {
        const status = progress.success 
          ? (progress.hasFunding ? '✅ 有funding' : '➖ 无funding')
          : '❌ 失败';
        console.log(`  [${progress.current}/${progress.total}] ${progress.doi.substring(0, 50)}... ${status}`);
      }
    );
    
    totalWithFunding += withFunding;
    totalErrors += errors;
    currentIndex += processed;
    
    console.log(`  📈 批次完成: ${processed} 篇, ${withFunding} 有funding, ${errors} 失败`);
    
    if (currentIndex < total) {
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  
  console.log(`\n🎉 完成! 累计 ${totalWithFunding}/${total} 篇成功获取 funding`);
  
  db.close();
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
