const http = require('http');
const fs = require('fs');

function fetch(path, file) {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3000' + path, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        fs.writeFileSync(file, buf);
        console.log(path + ' -> ' + res.statusCode + ', ' + buf.length + 'B');
        resolve(buf);
      });
    });
    req.on('error', e => { console.log('ERR: ' + e.message); resolve(null); });
    req.setTimeout(15000, () => { console.log('TIMEOUT'); req.destroy(); resolve(null); });
  });
}

(async () => {
  // Test CSV
  const csvBuf = await fetch('/api/export?format=csv', 'E:/Claw/JAC_Year/test_export.csv');
  if (csvBuf) {
    const bom = csvBuf[0]===0xEF && csvBuf[1]===0xBB && csvBuf[2]===0xBF;
    const str = csvBuf.toString('utf8');
    const lines = str.trim().split('\n');
    console.log('  CSV: BOM=' + bom + ', lines=' + lines.length);
    console.log('  Header: ' + lines[0]);
    // Check a data line
    console.log('  Line2: ' + lines[1].substring(0, 100));
  }

  // Test XLSX
  const xlsxBuf = await fetch('/api/export?format=xlsx', 'E:/Claw/JAC_Year/test_export.xlsx');
  if (xlsxBuf) {
    console.log('  XLSX: first 4 bytes=' + xlsxBuf[0].toString(16) + ' ' + xlsxBuf[1].toString(16) + ' ' + xlsxBuf[2].toString(16) + ' ' + xlsxBuf[3].toString(16));
  }

  // Test JSON
  const jsonBuf = await fetch('/api/export?format=json', 'E:/Claw/JAC_Year/test_export.json');
  if (jsonBuf) {
    try {
      const obj = JSON.parse(jsonBuf.toString());
      console.log('  JSON: total=' + obj.total + ', cols=' + Object.keys(obj.articles[0]).join(', '));
    } catch(e) {
      console.log('  JSON parse error: ' + e.message);
    }
  }

  // Test with filters
  await fetch('/api/export?format=csv&year=2025&type=Article', 'E:/Claw/JAC_Year/test_filtered.csv');
  console.log('  Filtered CSV done');

  console.log('\nAll tests complete!');
  process.exit(0);
})();
