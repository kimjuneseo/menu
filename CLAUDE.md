# 메뉴판 만들기 (kimjuneseo/menu)

용인의 제주 컨셉 한식뷔페에서 매일 바뀌는 점심·저녁 메뉴를 폰으로 입력해 A4 메뉴판 이미지를 만들고, 출력하거나 카카오톡으로 보내는 웹앱이에요.

- 공개 주소: https://kimjuneseo.github.io/menu/ (GitHub Pages, `main` 브랜치 루트, `.nojekyll`로 Jekyll 처리 없음).
  - `main`에 푸시하면 1분 안팎으로 배포돼요.
  - Pages는 `max-age=600`이라, 최근에 연 폰은 최대 10분 동안 예전 화면을 보여 줄 수 있어요.
- 빌드 도구가 없어요. `index.html` 한 파일에 HTML·CSS·JS가 모두 들어 있어요. 외부 의존은 Google Fonts와 jsPDF(cdnjs)뿐이에요.
- 손님은 어르신이 많고, 앱을 쓰는 식당 직원도 기기에 익숙하지 않다고 봐요. 그래서 화면 문구는 쉬운 해요체로, 버튼과 메뉴판 글씨는 크게 해요.
- 디자인 방향과 수치, 결정 이유는 `docs/design.md`에 있어요. 디자인을 바꾸기 전에 읽어 주세요.

## 파일

| 파일 | 내용 |
|---|---|
| `index.html` | 앱 전체 |
| `manifest.webmanifest`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | 폰 "홈 화면에 추가"용 |
| `docs/design.md` | 디자인 결정·색·글꼴·배치 수치 |
| `docs/preview.png` | README용 미리보기 |
| `tools/` | 메뉴판 렌더·저장 확인 스크립트. 배포와는 관계없고 Pages에 같이 올라가기만 해요 |
| `.nojekyll` | Pages가 마크다운을 Jekyll로 처리하지 않게 함 |

## index.html 구조 (`<script>` 안 순서)

### 1. 상태

- **`DEFAULTS`**: 입력칸 기본값이에요.
  - `FIELDS = Object.keys(DEFAULTS)`로 키마다 `#f-<키>` 입력 요소에 자동 연결돼요. 키를 추가하면 같은 id의 입력 요소도 꼭 만들어야 해요.
  - 입력칸이 아닌 상태(`size`)는 `DEFAULTS`에 넣지 마세요.
  - 저장은 입력할 때마다 state 전체를 해요. 그래서 한 번이라도 입력한 폰에는 `DEFAULTS`를 바꿔도 반영되지 않아요.
- **`OLD`**: 예전 기본값이에요. 형식은 `{ 키: [예전 값들] }`이에요.
  - 저장된 값이 이 중 하나와 같으면 `load()`가 새 기본값으로 바꿔요.
  - 기본 문구를 또 바꾸면 지금 값을 그 키의 배열에 더하세요. `OLD`에 없는 키면 `키: ['예전 값']`으로 새로 만드세요.
  - 바뀐 값은 다음에 입력할 때에야 저장돼요. 그러니 한 번 넣은 예전 값은 지우지 마세요.
  - 지금 들어 있는 값: 사투리 '혼저옵서예'·'하영 드십서예', '오늘의 추천', 국 설명 '뜨끈한 뚝배기에 담아 드려요'.
- **`SIZES`**: 칸별 글씨 크기예요. 70~150%를 `SZ_STEP` 10씩 조절하고, `state.size`에 저장해요. 잘못된 값은 `sizeOf`가 100으로 바꿔요.
- **`KEY = 'jeju-menu-v1'`**(localStorage): 바꾸면 식당 폰에 저장된 메뉴가 사라지니 바꾸지 마세요.
- **날짜(`greet`)**:
  - 'N월 N일 X요일' 형식이면서 오늘보다 앞선 날짜(`staleDate`)일 때만 오늘 날짜로 바꿔요. 미리 써 둔 내일 날짜나 직접 쓴 문구는 그대로 둬요.
  - 앱을 열 때(`load`), 다시 화면에 띄울 때(`visibilitychange`·`pageshow`·`focus`), 1분마다, 저장 버튼을 누를 때 확인해요(`refreshDate`). 홈 화면 앱은 새로고침 없이 이어서 열리는 일이 많아서예요.

### 2. 입력 화면 연결

- 입력칸 자동 높이, 제목 칩(오늘의 중식/석식)이 있어요.
- '예시 메뉴로 되돌리기'는 3초 안에 두 번 눌러야 실행되고, 글씨 크기는 그대로 둬요.
- 글씨 크기 −/+ 버튼이 있고, '모두 보통(100%)으로'는 한 번에 바로 실행돼요.
- '오늘 날짜로 되돌리기' 버튼이 있어요.

### 3. `model()`

- state를 그리기용 데이터 `d`로 바꿔요.
- 메인·반찬·국은 `lines()`가 줄바꿈과 쉼표(`,`)에서 나눈 배열이에요. 이름에 쉼표가 있으면 두 개로 갈라져요.
- `d.fs`는 칸별 글씨 배율이에요.

### 4. 그리기 `draw(ctx, scale, d)`

- 1240×1754(A4) 좌표계예요. 미리보기는 scale 1, 이미지·PDF 저장은 scale 2(2480×3508)예요.
- **`blocksOf(d, c, wrap)`**: 블록의 높이와 줄 나눔을 정하는 유일한 곳이에요. 블록은 `head` 제목·날짜, `mains`, `sides`, `soup`, `salad`, `closing`이에요.
- **배율 k:**
  - `draw`는 블록 높이 합이 `CT`~`CB`에 들어가도록 배율 `k`(≤1)를 구해 모든 크기에 곱해요.
  - k가 0.9보다 작으면 미리보기 아래에 "메뉴가 많아서 글씨를 조금 줄였어요."가 떠요.
  - 새 요소는 `blocksOf`에 높이를 넣고, `draw`에서도 같은 수치×k로 그려야 넘치지 않아요.
- **`draw`는 `d`만 읽어야 해요.** 저장 파일 캐시의 키가 `JSON.stringify(model())`이라서, `state`에서 바로 읽어 그린 옵션은 바꿔도 저장 파일에 반영되지 않아요.
- 바탕 섬유결·수묵 산·뚝배기·샐러드 아이콘은 오프스크린 캔버스에 2배로 한 번만 그려 캐시해요(`makePaper`, `makeBand`, `makePot`, `makeSalad`).
- 색은 `C`, 글꼴은 `SONG`/`BRUSH`/`BAT7`/`BAT4` 함수로 써요.
- 그리기 시작할 때 `lineJoin`/`lineCap`을 초기화해요. 앞서 그린 글자의 설정이 테두리에 남지 않게 하려는 거예요.

### 5. `ensureFonts(d)`

- 그릴 글자를 글꼴별로 미리 불러와요.
- 새 글꼴이나 새 글자를 그리면 여기에 꼭 추가하세요. 빠뜨리면 저장한 이미지에 대체 글꼴이 찍혀요.

### 6. 미리보기·저장

- 입력이 멈추고 120ms 뒤에 다시 그려요.
- **저장 흐름:**
  - `canShareFiles`가 참이면 `navigator.share`로 공유 창을 먼저 띄워요. 폰뿐 아니라 PC 크롬도 해당돼요.
  - 취소(AbortError)하면 아무것도 안 해요.
  - NotAllowedError면 다운로드하지 않고 '버튼을 한 번 더 눌러 주세요'를 띄워요.
  - 그 밖의 오류이거나 공유를 못 쓸 때만 다운로드해요.
- **공유 권한:**
  - 공유는 버튼을 누른 동작의 권한 안에서 불려야 해요. 그래서 `canShareFiles`일 때는 미리보기를 그리고 900ms 뒤에 PNG를 미리 만들어 둬요(`schedulePrebuild`).
  - PDF는 누를 때 만들어서, 폰에서는 처음에 한 번 더 눌러야 할 수 있어요.
  - `save()`에서 `navigator.share` 앞에 `await`를 더 넣지 마세요.
- 같은 내용이면 이미 만든 파일을 다시 써요.

## 지켜야 할 것

- **iOS Safari 호환:** `ctx.filter`, `ctx.roundRect`, `ctx.letterSpacing`을 쓰지 마세요. 둥근 사각형은 `rr`, 자간은 `drawSpaced`를 써요.
- **같은 그림:** 매번 똑같이 그려야 해요. `Math.random` 대신 `seeded(시드)`를 쓰세요.
- **이미지 파일 없음:** 그림은 캔버스로만 그려요.
- **글꼴:** Google Fonts만 써요. `<link>`와 `ensureFonts` 둘 다에 넣어야 해요.
- **디자인 변경:**
  - `docs/design.md`의 결정을 따르고, 바꿀 때는 시안 이미지를 먼저 보여 주고 확인받으세요.
  - 바탕색 #F5F8FC는 `C.paper`와 CSS `.sheet` 배경 두 곳에 있으니 같이 바꾸세요.
- **메뉴판 문구:**
  - 사투리를 쓰지 않아요.
  - 메인 칸은 '추천'이 아니에요. 뷔페는 다 골라 먹을 수 있기 때문이에요.
  - 샐러드바에 '무료'·'무제한'처럼 식당에 확인하지 않은 표현을 쓰지 마세요.
- **화면 글자:** 단어 단위로만 줄바꿈해요(`body`에 `word-break:keep-all`).
- **코드 스타일:** 지금 코드처럼 짧은 헬퍼 이름, 촘촘한 한 줄 코드, 짧은 한국어 주석으로 맞춰요.

## 확인 방법

`tools/`는 Node.js 18 이상이 필요하고, 설치된 Chrome/Edge를 headless로 띄워요. 브라우저를 못 찾으면 `CHROME_PATH`에 실행 파일 경로를 지정하세요.

```sh
cd tools && npm install
npm run check                            # render-all + save-check 를 한 번에 (실패하면 종료 코드 1)
node render-all.js                       # states/*.json 을 out/<상태>.png 로 렌더
node render.js ../index.html out/a.png states/stress.json
node save-check.js ../index.html out/download   # 저장 버튼 → 2480x3508 PNG + PDF (이 폴더의 png·pdf 는 지워짐)
node render.js https://kimjuneseo.github.io/menu/ out/live.png   # 배포된 사이트
```

- 상태 파일은 `{"jeju-menu-v1": {...}}` 형식이에요. 출력 JSON의 `errors`가 `[]`인지 보세요.
  - `default`: 기본 메뉴
  - `stress`: 메뉴 많은 날
  - `nosalad`: 샐러드 비움
  - `oldphone`: 예전 사투리 문구가 저장된 폰
  - `sizes`: 글씨 130%
- 숫자만 보지 말고 PNG를 열어서 겹침이나 잘림이 없는지 눈으로 확인하세요.
- tools는 메뉴판 캔버스만 찍어요. 입력 화면(CSS)을 바꿨다면 폭 390px로 띄워서 버튼과 입력칸이 넘치거나 어색하게 줄바꿈되지 않는지 직접 보세요.
- 폰의 공유 창(`navigator.share`)은 headless로 확인할 수 없어요. 실제 폰에서 눌러 봐야 해요.
- `tools/.npmrc`(`omit-lockfile-registry-resolved=true`)는 `package-lock.json`에 다운로드 주소를 남기지 않게 해요. 이 PC의 npm은 사내 저장소를 쓰는데, 그 주소가 공개 저장소에 들어가지 않게 하려는 거예요.

## 배포

- `main`에 푸시하는 것이 곧 배포예요. 식당에서 실제로 쓰는 화면이니 푸시하기 전에 사용자에게 확인받으세요.
- 이 PC의 Git Bash에서 `SSL peer certificate or SSH remote key was not OK` 오류가 나면 Windows 인증서 저장소를 쓰세요: `git -c http.sslBackend=schannel push origin HEAD:main`.
- 푸시한 뒤에는 두 가지를 확인하세요.
  - 배포된 파일에 이번 변경이 들어갔는지: 새로 넣은 문구를 `https://kimjuneseo.github.io/menu/`에서 찾아보세요.
  - 그림이 맞게 나오는지: `render.js`로 실제 사이트를 렌더해 보세요.

## 알려진 문제

- PC 크롬에서는 공유 기능이 켜져 있어서(`canShareFiles`) '이미지 저장·공유'를 누르면 다운로드 대신 윈도우 공유 창이 떠요. 그 창을 닫아도 다운로드되지 않아요.
- 폰에서는 공유 안내 문구가 하단 고정 줄 안에 있어서 입력할 때 화면을 꽤 차지해요.
