// 사용법: node render.js <index.html 또는 주소> <출력.png> [states/상태.json]
// 메뉴판 캔버스(#pv, A4 1240x1754 · 스토리 1240x2205)를 PNG 로 저장하고 {fonts, note, errors} 를 출력한다.
// 상태 파일({"jeju-menu-v1": {...}})을 주면 localStorage 에 넣고 연다. 없으면 빈 상태(기본 메뉴).
const fs = require('fs');
const path = require('path');
const { launch, urlOf, readState } = require('./browser');

async function render(page, target, out, state) {
  await page.evaluateOnNewDocument(s => {
    try { localStorage.clear(); if (s) for (const [k, v] of Object.entries(s)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch (e) {}
  }, state);
  await page.goto(urlOf(target), { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await new Promise(r => setTimeout(r, 1500));   // 미리보기는 입력 뒤 120ms 에 다시 그림
  const data = await page.evaluate(() => document.getElementById('pv').toDataURL('image/png'));
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
  const fonts = await page.evaluate(() => [...new Set([...document.fonts].filter(f => f.status === 'loaded').map(f => f.family))]);
  const note = await page.evaluate(() => document.getElementById('note').textContent);
  return { out, fonts, note };
}

async function run(target, out, statePath) {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    const r = await render(page, target, out, readState(statePath));
    return Object.assign(r, { errors });
  } finally { await browser.close(); }
}

module.exports = { run };

if (require.main === module) {
  const [target, out, statePath] = process.argv.slice(2);
  if (!target || !out) { console.error('사용법: node render.js <index.html 또는 주소> <출력.png> [상태.json]'); process.exit(2); }
  run(target, out, statePath).then(r => { console.log(JSON.stringify(r)); if (r.errors.length) process.exit(1); })
    .catch(e => { console.error(e); process.exit(1); });
}
