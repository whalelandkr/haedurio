# 해드리오 사이트 빌드

사이트는 정적 HTML입니다. 문구와 가격은 `src/`에서 고치고, 빌드하면 각 언어 페이지가 다시 만들어집니다.

## 파일 구조

| 위치 | 내용 |
| --- | --- |
| `src/site.json` | 가격(원), 연락처, 사업자 정보, 언어 목록, 문의 폼 설정 |
| `src/i18n/en.json` | 영어 문구 (기준 파일) |
| `src/i18n/ja.json` 외 4개 | 일본어, 简体中文(zh-cn), 繁體中文(zh-tw), 베트남어(vi), 태국어(th) |
| `tools/` | 빌드 스크립트 (의존성 없음, Node 18 이상) |
| `assets/` | CSS, JS, 폰트, 도장 로고, 공유 이미지 |

`index.html`, `*/index.html`, `404.html`, `sitemap.xml`은 빌드 결과물입니다. 직접 고치지 마세요.

## 고치는 순서

1. 문구: `src/i18n/en.json`과 같은 위치의 각 언어 파일을 함께 고칩니다.
2. 가격: `src/site.json`의 `services[].won`을 고치고, 문구 안의 `{won:56000}` 같은 금액도 맞춥니다.
3. 번역 확인: `node tools/check-i18n.mjs ja` (언어마다 실행)
4. 빌드: `node tools/build.mjs`
5. 바뀐 파일을 모두 커밋합니다. main에 올라가면 Vercel이 바로 배포합니다.

## 규칙

- 문구 속 `{price}`, `{won:39000}` 같은 자리 표시는 지우거나 바꾸지 않습니다. 빌드가 이 부분을 채웁니다.
- 원화는 `{won:금액}`으로 씁니다. 언어별 표기(베트남어는 `39.000 ₩`)는 빌드가 처리합니다.
- 번역 파일의 키와 목록 개수는 영어와 같아야 합니다. 다르면 빌드가 멈추고 위치를 알려 줍니다.

## 문의 폼

- 요청은 Supabase Edge Function `submit-inquiry`로 갑니다 (`is_secret: true`). 관리자 화면 `__admin__/`에서 확인합니다.
- 스팸 방지는 Cloudflare Turnstile입니다. 새 도메인(예: Vercel 미리보기 주소)에서 폼을 시험하려면 Cloudflare 대시보드의 Turnstile 위젯 설정에 그 도메인을 추가해야 합니다.
