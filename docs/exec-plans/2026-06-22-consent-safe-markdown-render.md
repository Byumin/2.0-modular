# Execution Plan

## Task Title
- 개인정보 동의 문구 안전한 Markdown 렌더링

## Request Summary
- 설정에 Markdown 형식으로 저장한 개인정보 동의 문구가 수검자 프론트 화면에 Markdown처럼 반영되도록 한다.
- 운영 화면이므로 보안을 고려해 진행한다.

## Goal
- `dangerouslySetInnerHTML` 없이 React 노드 기반으로 제한된 Markdown을 렌더링한다.
- HTML 태그는 실행/삽입하지 않고 일반 텍스트로 처리한다.
- 링크는 안전한 protocol만 허용한다.
- 기존 줄바꿈 텍스트도 읽기 좋게 유지한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - 코드/구조: 해당 없음
  - DB: 해당 없음
  - UI/디자인: `DESIGN.md`, `QUALIT_SCORE.md` 이전 확인
  - 문서 체계: 해당 없음
  - 설명/디버깅: 해당 없음
  - 코드 정리 산출물: 해당 없음
- [x] 운영/실행 서버 DB가 필요한 작업이면 `docs/database/runtime-db.md`의 DB 조회 전 확인 규칙 적용
- [x] 검증 방법과 미검증 가능 항목 정의

## Initial Hypothesis
- 현재 동의 문구는 `ProfileStep`에서 `<p className="whitespace-pre-wrap">`로 단순 텍스트 렌더링되어 Markdown 문법이 그대로 보인다.
- React 노드 기반 제한 renderer를 추가하면 XSS 위험을 줄이면서 Markdown 표시 요구를 충족할 수 있다.

## Initial Plan
1. 수검자 동의 모달 렌더링 위치를 확인한다.
2. 제한 Markdown renderer 컴포넌트를 추가한다.
3. 동의 모달에서 기존 `<p>` 렌더링을 새 컴포넌트로 교체한다.
4. 프론트엔드 빌드로 검증한다.

## Progress Updates
### Update 1
- Time: 2026-06-22
- Change: `ProfileStep` 동의 모달이 `consentText || PRIVACY_CONTENT`를 단순 텍스트로 렌더링하는 것을 확인했다.
- Reason: Markdown 미반영 원인을 확정하기 위해서다.

### Update 2
- Time: 2026-06-22
- Change: `SafeMarkdown` 컴포넌트를 추가하고 동의 모달 렌더링을 교체했다.
- Reason: 운영 화면에서 HTML 삽입 없이 제한 Markdown을 안전하게 표현하기 위해서다.

### Update 3
- Time: 2026-06-22
- Change: 프론트엔드 빌드와 새 번들 서빙 여부를 확인했다.
- Reason: TypeScript/Vite 빌드와 FastAPI 정적 서빙 반영 상태를 검증하기 위해서다.

## Result
- 완료.
- `frontend/src/pages/assessment/components/SafeMarkdown.tsx` 추가.
- `ProfileStep` 개인정보 동의 모달에서 `SafeMarkdown`으로 동의 문구를 렌더링하도록 변경.
- 지원 문법:
  - `#`, `##`, `###` 제목
  - `-` / `*` unordered list
  - `1.` / `1)` ordered list
  - `>` 인용
  - `**굵게**`, `*기울임*`, `` `inline code` ``
  - `[라벨](URL)` 링크. 단, `http:`, `https:`, `mailto:`, `tel:`, `/`, `#`만 링크로 허용.
- HTML 태그는 React 텍스트 노드로 처리되어 실행되지 않는다.

## Verification
- Checked:
  - `npm run build:frontend` 성공.
  - `dangerouslySetInnerHTML` 미사용 확인.
  - 8120 실시 링크 HTML이 새 번들 `index-CloUikg8-v2.js`, `index-BPgWVbof-v2.css`를 참조하는 것 확인.
- Not checked:
  - 실제 브라우저 스크린샷. 현재 Playwright Chromium이 `ubuntu26.04-x64` 미지원이라 이전 작업과 동일하게 캡처 검증은 수행하지 못했다.

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 기존 구현은 개인정보 동의 문구를 단순 텍스트로 렌더링해 Markdown 문법이 그대로 노출됐다.

### Why
- 기능 스펙은 "관리자 직접 입력 텍스트"였고 Markdown 렌더링 요구는 기존 구현 범위에 없었다.

### Next Time
- 운영 화면에서 사용자 입력 포맷을 렌더링해야 할 때는 HTML 삽입보다 React 노드 기반 제한 렌더러를 먼저 검토한다.

## Related Documents
- [AGENTS.md](../../AGENTS.md)
- [DESIGN.md](../../DESIGN.md)
- [QUALIT_SCORE.md](../../QUALIT_SCORE.md)
- [docs/features/privacy-consent-spec.md](../features/privacy-consent-spec.md)
