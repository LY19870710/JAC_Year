import { DatabaseManager } from './src/database';

async function test() {
  console.log('初始化数据库...');
  const db = new DatabaseManager();
  await db.init();
  
  console.log('获取年份列表...');
  const years = db.getYears();
  console.log('年份:', years);
  
  console.log('获取统计...');
  const stats = db.getStats();
  console.log('总数:', stats.total);
  console.log('前5机构:', stats.topAffiliations.slice(0, 5));
  
  console.log('关闭数据库...');
  db.close();
  
  console.log('✅ 测试成功!');
}

test().catch(err => {
  console.error('❌ 错误:', err);
  process.exit(1);
});
