// 사용법: node save-check.js <index.html 또는 주소> <출력 폴더, 예: out/download>
// 출력 폴더 안의 png·pdf 는 실행할 때 지워지니 다운로드 폴더 같은 곳을 주지 말 것.
// 공유 기능을 끈 PC 상태로 '이미지 저장' · '인쇄용 PDF' 를 눌러 실제 파일(2480x3508 PNG, PDF)이 나오는지 확인한다.
// 폰의 공유 창(navigator.share)은 headless 로 확인할 수 없으니 실제 폰에서 따로 눌러 볼 것.
const fs = require('fs');
const path = require('path');
const { launch, urlOf } = require('./browser');

(async () => {
  const [target, outDir] = process.argv.slice(2);
  if (!target || !outDir) { console.error('사용법: node save-check.js <index.html 또는 주소> <출력 폴더, 예: out/download>'); process.exit(2); }
  const dir = path.resolve(outDir);
  fs.mkdirSync(dir, { recursive: true });
  // 폴더 안의 png·pdf 파일을 모두 지움 (다운로드가 끝났는지 확장자로 알아보기 때문)
  for (const f of fs.readdirSync(dir)) { const p = path.join(dir, f); if (/\.(png|pdf)$/i.test(f) && fs.statSync(p).isFile()) fs.unlinkSync(p); }
  const browser = await launch();
  const errors = [];
  try {
    const page = await browser.newPage();
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.evaluateOnNewDocument(() => {
      try { localStorage.clear(); } catch (e) {}
      for (const k of ['share', 'canShare']) try { Object.defineProperty(Navigator.prototype, k, { value: undefined, configurable: true }); } catch (e) {}
    });
    const cdp = await page.createCDPSession();
    await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dir });
    await page.goto(urlOf(target), { waitUntil: 'networkidle0', timeout: 60000 });
    await new Promise(r => setTimeout(r, 1500));
    const wait = async ext => { for (let i = 0; i < 40; i++) { if (fs.readdirSync(dir).some(f => f.endsWith(ext))) return true; await new Promise(r => setTimeout(r, 250)); } return false; };
    await page.click('#save-png'); const png = await wait('.png');
    await page.click('#save-pdf'); const pdf = await wait('.pdf');
    await new Promise(r => setTimeout(r, 500));
    const status = await page.$eval('#status', e => e.textContent);
    const files = fs.readdirSync(dir).map(f => ({ name: f, bytes: fs.statSync(path.join(dir, f)).size }));
    const pngFile = files.find(f => f.name.endsWith('.png'));
    let size = null;
    if (pngFile) { const b = fs.readFileSync(path.join(dir, pngFile.name)); size = [b.readUInt32BE(16), b.readUInt32BE(20)]; }
    const ok = png && pdf && size && size[0] === 2480 && size[1] === 3508 && !errors.length;
    console.log(JSON.stringify({ ok, status, files, pngSize: size, errors }));
    process.exitCode = ok ? 0 : 1;
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
