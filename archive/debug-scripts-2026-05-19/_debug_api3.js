const https = require('https');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html,application/json',
      }
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return httpsGet(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  // Test a DOI that we KNOW has funding in the DB
  const doi = '10.26599/JAC.2024.9220831';  // has "The National Natural Science Foundation" in DB
  
  const url = `https://www.sciopen.com/article/full_text?doi=${encodeURIComponent(doi)}`;
  console.log('URL:', url);
  
  const raw = await httpsGet(url);
  const json = JSON.parse(raw);
  const obj = json.object;
  
  // Check if there's acknowledgements section in contentList
  const contentList = obj?.contentList;
  if (contentList && contentList.length > 0) {
    console.log('\n--- contentList items ---');
    contentList.forEach((item, i) => {
      console.log(`[${i}] type=${item.type}, title=${item.title}, content length=${item.content?.length}`);
      if (item.title && item.title.toLowerCase().includes('acknow')) {
        console.log(`  *** ACKNOWLEDGEMENTS FOUND: ${item.content?.substring(0, 500)}`);
      }
    });
  }
  
  // Also check trees
  const trees = obj?.trees;
  if (trees && trees.length > 0) {
    console.log('\n--- trees items ---');
    trees.forEach((item, i) => {
      console.log(`[${i}] type=${item.type}, title=${item.title}`);
      if (item.title && item.title.toLowerCase().includes('acknow')) {
        console.log(`  *** FOUND: ${JSON.stringify(item).substring(0, 500)}`);
      }
    });
  }
  
}

main().catch(e => console.error(e));
