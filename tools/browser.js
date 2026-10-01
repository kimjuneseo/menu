// 설치된 Chrome/Edge 를 찾아 headless 로 띄움 (CHROME_PATH 로 직접 지정 가능)
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const launch = () => {
  const exe = CANDIDATES.find(p => fs.existsSync(p));
  if (!exe) throw new Error('Chrome/Edge 를 찾지 못했어요. CHROME_PATH 환경변수로 실행 파일 경로를 지정하세요.');
  return puppeteer.launch({ executablePath: exe, headless: true, args: ['--allow-file-access-from-files'] });
};
// 파일 경로면 file:// 주소로, http(s) 주소면 그대로
const urlOf = p => /^https?:/.test(p) ? p : require('url').pathToFileURL(path.resolve(p)).href;
const readState = p => p ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;

module.exports = { launch, urlOf, readState };
