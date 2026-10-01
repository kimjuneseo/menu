// 사용법: node render-all.js [index.html 또는 주소]
// states/ 의 모든 상태를 out/<상태>.png 로 렌더한다. 그림은 직접 열어서 눈으로 확인할 것.
const fs = require('fs');
const path = require('path');
const { run } = require('./render');

(async () => {
  const target = process.argv[2] || path.join(__dirname, '..', 'index.html');
  const dir = path.join(__dirname, 'states');
  let failed = 0;
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
    const r = await run(target, path.join(__dirname, 'out', f.replace(/\.json$/, '.png')), path.join(dir, f));
    if (r.errors.length) failed++;
    console.log(`${f.padEnd(14)} errors=${JSON.stringify(r.errors)} note="${r.note}"`);
  }
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
