const { DatabaseManager } = require('./dist/database');

async function test() {
  console.log('初始化数据库...');
  const db = new DatabaseManager();
  await db.init();
  
  console.log('获取年份列表...');
  const years = db.getYears();
  console.log('年份:', years);
  
  console.log('✅ 数据库测试成功!');
  db.close();
}

test().catch(err => {
  console.error('❌ 错误:', err.message);
  console.error(err.stack);
  process.exit(1);
});
