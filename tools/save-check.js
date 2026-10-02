// 사용법: node save-check.js <index.html 또는 주소> <출력 폴더, 예: out/download> [a4|story]
// 출력 폴더 안의 png·pdf 는 실행할 때 지워지니 다운로드 폴더 같은 곳을 주지 말 것.
// 공유 기능을 끈 PC 상태로 '이미지 저장' · '인쇄용 PDF' 를 눌러 실제 파일이 나오는지 확인한다.
// 이미지는 a4 면 2480x3508, story 면 1080x1920(이름 끝 _스토리), PDF 는 판형과 관계없이 A4.
// 폰의 공유 창(navigator.share)은 headless 로 확인할 수 없으니 실제 폰에서 따로 눌러 볼 것.
const fs = require('fs');
const path = require('path');
const { launch, urlOf } = require('./browser');

const SIZE = { a4: [2480, 3508], story: [1080, 1920] };

(async () => {
  const [target, outDir, fmt = 'a4'] = process.argv.slice(2);
  if (!target || !outDir || !SIZE[fmt]) { console.error('사용법: node save-check.js <index.html 또는 주소> <출력 폴더, 예: out/download> [a4|story]'); process.exit(2); }
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
    await page.evaluateOnNewDocument(fmt => {
      try { localStorage.clear(); localStorage.setItem('jeju-menu-v1', JSON.stringify({ fmt })); } catch (e) {}
      for (const k of ['share', 'canShare']) try { Object.defineProperty(Navigator.prototype, k, { value: undefined, configurable: true }); } catch (e) {}
    }, fmt);
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
    const named = !!pngFile && (fmt === 'story') === pngFile.name.endsWith('_스토리.png');
    const ok = png && pdf && named && size && size[0] === SIZE[fmt][0] && size[1] === SIZE[fmt][1] && !errors.length;
    console.log(JSON.stringify({ ok, fmt, status, files, pngSize: size, errors }));
    process.exitCode = ok ? 0 : 1;
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
