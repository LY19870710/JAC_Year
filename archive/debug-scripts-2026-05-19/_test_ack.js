const https = require('https');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json, text/html',
      }
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        res.resume();
        return resolve(httpsGet(res.headers.location));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
  });
}

async function main() {
  const doi = '10.26599/JAC.2024.9220831';  // 已知有 funding

  // 测试1: full_text API
  console.log('=== full_text API ===');
  try {
    const url = `https://www.sciopen.com/article/full_text?doi=${encodeURIComponent(doi)}`;
    const { body } = await httpsGet(url);
    const json = JSON.parse(body);
    const obj = json.object;
    
    console.log('paperId:', obj?.id);
    console.log('contentList count:', obj?.contentList?.length);
    
    if (obj?.contentList) {
      for (const item of obj.contentList) {
        const title = item.title || '';
        const type = item.type || '';
        const content = item.content || '';
        const hasFunding = content.includes('Foundation') || content.includes('funding') || content.includes('Grant');
        console.log(`  [${type}] ${title} (${content.length} chars) ${hasFunding ? '★' : ''}`);
        if (hasFunding) {
          console.log(`    Preview: ${content.substring(0, 200)}`);
        }
      }
    }
    
    console.log('\ntrees:');
    for (const tree of (obj?.trees || [])) {
      const title = tree.title || '';
      const hasFunding = title.toLowerCase().includes('acknow') || title.includes('Funding') || title.includes('致谢');
      console.log(`  ${title} ${hasFunding ? '★' : ''}`);
    }
  } catch (e) {
    console.log('Error:', e.message);
  }

  // 测试2: RelatedInfo API (用 paperId)
  console.log('\n=== RelatedInfo API ===');
  try {
    const paperId = 'your_paper_id_here'; // 需要先获取
    const url2 = `https://www.sciopen.com/v2/Paper/RelatedInfo?resourceId=${paperId}`;
    console.log('URL:', url2);
    const { body } = await httpsGet(url2);
    console.log('Response:', body.substring(0, 500));
  } catch (e) {
    console.log('Error:', e.message);
  }
}

main();
