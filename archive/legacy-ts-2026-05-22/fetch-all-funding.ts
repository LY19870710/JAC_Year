/**
 * fetch-all-funding.ts — 批量抓取所有文章的 funding 信息
 * 
 * 用法: npx ts-node scripts/fetch-all-funding.ts [batchSize] [startIndex]
 * 示例: npx ts-node scripts/fetch-all-funding.ts 20 0
 */

import { DatabaseManager } from '../src/database';
import { fetchBatchFunding, FetchProgress } from '../src/funding-fetcher';

const DEFAULT_BATCH = 20;
const DELAY_BETWEEN_BATCHES = 5000; // 批次间间隔 5 秒

async function main() {
  const batchSize = parseInt(process.argv[2]) || DEFAULT_BATCH;
  const startIndex = parseInt(process.argv[3]) || 0;
  
  const db = new DatabaseManager();
  await db.init();
  
  // 获取所有没有 funding 的文章
  const pendingArticles = db.getArticlesWithoutFunding();
  const totalPending = pendingArticles.length;
  
  if (totalPending === 0) {
    console.log('✅ 所有文章已有 funding 信息');
    process.exit(0);
  }
  
  console.log(`\n📊 统计: ${totalPending} 篇文章待抓取 funding`);
  console.log(`⚙️  配置: 每批 ${batchSize} 篇, 从第 ${startIndex} 篇开始`);
  console.log(`⏱️  预计: 约 ${Math.ceil(totalPending / batchSize)} 批次, 总耗时约 ${Math.ceil(totalPending * 2 / 60)} 分钟\n`);
  
  let totalProcessed = 0;
  let totalWithFunding = 0;
  let totalErrors = 0;
  let batchNum = 0;
  
  // 从指定位置开始处理
  let currentIndex = startIndex;
  
  while (currentIndex < totalPending) {
    batchNum++;
    const remaining = totalPending - currentIndex;
    const currentBatchSize = Math.min(batchSize, remaining);
    
    console.log(`\n🔄 批次 ${batchNum}: 处理第 ${currentIndex + 1}-${currentIndex + currentBatchSize} 篇 (剩余 ${remaining} 篇)`);
    console.log('-'.repeat(60));
    
    // 获取当前批次的文章
    const batchArticles = pendingArticles.slice(currentIndex, currentIndex + currentBatchSize);
    
    // 执行批量抓取
    const results: FetchProgress[] = [];
    const { processed, withFunding, errors } = await fetchBatchFunding(
      db,
      currentBatchSize,
      (progress) => {
        results.push(progress);
        const status = progress.success 
          ? (progress.hasFunding ? '✅ 有funding' : '➖ 无funding')
          : '❌ 失败';
        console.log(`  [${progress.current}/${progress.total}] ${progress.doi.substring(0, 50)}... ${status}`);
      }
    );
    
    totalProcessed += processed;
    totalWithFunding += withFunding;
    totalErrors += errors;
    currentIndex += processed;
    
    // 批次统计
    console.log('-'.repeat(60));
    console.log(`📈 批次完成: ${processed} 篇处理, ${withFunding} 篇有funding, ${errors} 篇失败`);
    console.log(`📊 累计进度: ${totalProcessed}/${totalPending} (${(totalProcessed/totalPending*100).toFixed(1)}%)`);
    
    // 保存进度到文件（方便中断后恢复）
    const progressInfo = {
      timestamp: new Date().toISOString(),
      totalPending,
      processed: totalProcessed,
      withFunding: totalWithFunding,
      errors: totalErrors,
      currentIndex,
      percentage: (totalProcessed / totalPending * 100).toFixed(1)
    };
    require('fs').writeFileSync(
      'funding-progress.json',
      JSON.stringify(progressInfo, null, 2)
    );
    
    // 如果不是最后一批，等待一段时间
    if (currentIndex < totalPending) {
      console.log(`⏳ 等待 ${DELAY_BETWEEN_BATCHES/1000} 秒后继续...`);
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }
  
  // 最终统计
  console.log('\n' + '='.repeat(60));
  console.log('🎉 全部完成!');
  console.log('='.repeat(60));
  console.log(`📊 总计处理: ${totalProcessed} 篇`);
  console.log(`✅ 有 funding: ${totalWithFunding} 篇 (${(totalWithFunding/totalProcessed*100).toFixed(1)}%)`);
  console.log(`➖ 无 funding: ${totalProcessed - totalWithFunding - totalErrors} 篇`);
  console.log(`❌ 失败: ${totalErrors} 篇`);
  console.log('='.repeat(60));
  
  // 清理进度文件
  try {
    require('fs').unlinkSync('funding-progress.json');
  } catch {}
  
  process.exit(0);
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

main().catch(err => {
  console.error('❌ 错误:', err);
  process.exit(1);
});
