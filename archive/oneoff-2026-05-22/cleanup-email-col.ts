/**
 * 清理 email 列（静态数据优化）
 * email 列存的是出版社邮箱，不是作者邮箱，通讯作者邮箱在 corresponding_email/corresponding_json 中已有
 */
import { DatabaseManager } from '../src/database';

async function cleanup() {
  const db = new DatabaseManager();
  await db.init();
  
  // 清空 email 列（保留列定义，只是数据无用）
  // 更好的方案是 ALTER TABLE DROP COLUMN，但 sql.js 不支持
  // 所以直接清空数据即可
  db.clearEmailColumn();
  
  console.log('✅ email 列已清空');
  
  db.close();
}

if (require.main === module) {
  cleanup().catch(err => {
    console.error('错误:', err);
    process.exit(1);
  });
}

export { cleanup };
