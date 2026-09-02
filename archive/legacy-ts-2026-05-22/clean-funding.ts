/**
 * clean-funding.ts — 清洗数据库中已有的 funding 字段
 * 去除 "We are thankful...", "Financial support..." 等前缀
 */

import { DatabaseManager } from '../src/database';

// 更全面的前缀模式
const PREFIX_PATTERNS: [RegExp, string][] = [
  // 感谢类
  [/^[\s\w]*(?:are|is|were|was)\s+deeply\s+thankful\s+for\s+(?:the\s+)?(?:financial\s+)?support\s+(?:from|of)\s+/i, ''],
  [/^[\s\w]*(?:are|is|were|was)\s+thankful\s+for\s+(?:the\s+)?(?:financial\s+)?support\s+(?:from|of)\s+/i, ''],
  [/^[\s\w]*(?:are|is|were|was)\s+grateful\s+(?:to|for)\s+(?:the\s+)?/i, ''],
  [/^[\s\w]*(?:would\s+like\s+to\s+)?(?:thank|acknowledge)\s+/i, ''],
  [/^[\s\w]*(?:express(?:es)?\s+)?(?:their\s+)?gratitude\s+(?:to|for)\s+/i, ''],
  
  // 支持/资助类
  [/^(?:financial\s+)?support\s+(?:from|of|by)\s+/i, ''],
  [/^(?:this\s+)?(?:work|study|research|project|paper)\s+(?:was|is|were|are)\s+(?:financially\s+)?(?:supported|financed|funded|sponsored)\s+(?:by|from|through)\s+/i, ''],
  [/^(?:this\s+)?(?:work|study|research|project|paper)\s+(?:was|is|were|are)\s+(?:also\s+)?(?:supported|financed|funded|sponsored)\s+(?:by|from|through)\s+/i, ''],
  [/^(?:the\s+)?(?:work|study|research|project)\s+(?:conducted\s+at\s+[\w\s]+\s+)?(?:was|is|were|are)\s+(?:also\s+)?(?:supported|financed|funded|sponsored)\s+(?:by|from|through)\s+/i, ''],
  [/^(?:the\s+)?present\s+(?:work|study|research|project|paper)\s+(?:was|is|were|are)\s+(?:financially\s+)?(?:supported|financed|funded|sponsored)\s+(?:by|from|through)\s+/i, ''],
  
  // 作者声明类
  [/^[\s\w]*acknowledge[s]?\s+/i, ''],
  [/^[\s\w]*appreciate[s]?\s+/i, ''],
  
  // 其他前缀
  [/^also\s+/i, ''],
  [/^additionally\s+/i, ''],
  [/^furthermore\s+/i, ''],
  [/^moreover\s+/i, ''],
  [/^in\s+addition\s+/i, ''],
  
  // 标签类
  [/^(?:funding|acknowledgements?|acknowledgments?):\s*/i, ''],
];

// 清理单条 funding
function cleanFunding(raw: string): string {
  if (!raw || raw.trim().length < 10) return '';
  
  let cleaned = raw.trim();
  
  // 循环去除前缀，直到没有变化
  let changed = true;
  while (changed) {
    changed = false;
    for (const [pattern, replacement] of PREFIX_PATTERNS) {
      const before = cleaned;
      cleaned = cleaned.replace(pattern, replacement).trim();
      if (cleaned !== before) {
        changed = true;
        break; // 从头开始再检查一遍
      }
    }
  }
  
  // 去除开头标点
  cleaned = cleaned.replace(/^[\.,:\-\u2014\u2013;\s]+/, '').trim();
  
  // 去除结尾的句号和不完整内容
  cleaned = cleaned.replace(/[.;]+$/, '').trim();
  
  // 修复 Unicode 转义: R\u0026D → R&D, \uFB01 → fi
  cleaned = cleaned.replace(/\\u0026/g, '&');
  cleaned = cleaned.replace(/\\uFB01/gi, 'fi');
  
  // 首字母大写
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  
  return cleaned;
}

async function main() {
  const db = new DatabaseManager();
  await db.init();
  
  // 获取所有有 funding 的文章
  const articles = db.getArticlesWithoutFunding();
  // 注意：getArticlesWithoutFunding 返回的是没有 funding 的，我们需要相反的
  // 直接查询数据库
  const allArticles = (db as any).db.exec(
    `SELECT doi, funding FROM articles WHERE funding IS NOT NULL AND funding != ''`
  );
  
  if (!allArticles.length || !allArticles[0].values.length) {
    console.log('没有找到需要清洗的 funding 数据');
    process.exit(0);
  }
  
  const columns = allArticles[0].columns;
  const doiIdx = columns.indexOf('doi');
  const fundingIdx = columns.indexOf('funding');
  
  let cleaned = 0;
  let unchanged = 0;
  let emptied = 0;
  
  console.log(`找到 ${allArticles[0].values.length} 条 funding 记录，开始清洗...\n`);
  
  for (const row of allArticles[0].values) {
    const doi = row[doiIdx];
    const original = row[fundingIdx];
    const newFunding = cleanFunding(original);
    
    if (newFunding !== original) {
      if (newFunding === '') {
        emptied++;
        console.log(`⚠️  ${doi}: 清洗后为空`);
        console.log(`   原: ${original.substring(0, 80)}...`);
      } else {
        cleaned++;
        if (cleaned <= 5) {
          console.log(`✅ ${doi}:`);
          console.log(`   原: ${original.substring(0, 80)}...`);
          console.log(`   新: ${newFunding.substring(0, 80)}...`);
          console.log();
        }
      }
      
      // 更新数据库
      (db as any).db.run(`UPDATE articles SET funding = ? WHERE doi = ?`, [newFunding, doi]);
    } else {
      unchanged++;
    }
  }
  
  // 保存数据库
  (db as any).save();
  
  console.log('\n' + '='.repeat(60));
  console.log('清洗完成!');
  console.log('='.repeat(60));
  console.log(`✅ 已清洗: ${cleaned} 条`);
  console.log(`➖ 未变化: ${unchanged} 条`);
  console.log(`⚠️  清空:   ${emptied} 条`);
  console.log('='.repeat(60));
  
  process.exit(0);
}

main().catch(err => {
  console.error('❌ 错误:', err);
  process.exit(1);
});
