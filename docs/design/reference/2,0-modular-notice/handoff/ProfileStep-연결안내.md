# ProfileStep 연결 안내 — 연구 참여 안내 (A안)

대상 파일: `frontend/src/pages/assessment/steps/ProfileStep.tsx`
(브랜치 `feat/report-page-revamp`)

추가 파일: `ResearchNotice.tsx` 를
`frontend/src/pages/assessment/steps/components/ResearchNotice.tsx`
(또는 `assessment/components/`) 로 복사.

---

## 1) import 추가 (ProfileStep.tsx 상단)

```tsx
import { ResearchNotice } from "./components/ResearchNotice"
```

> 경로는 실제로 둔 위치에 맞게 조정하세요.

## 2) 좌측 hero 안에 삽입

`ProfileStep` 의 좌측 `<section>` 안, intro `<div>` **바로 다음**에
`<ResearchNotice />` 한 줄을 넣습니다. (z-10 flex 컨테이너 내부)

```tsx
<div className="relative z-10 flex min-h-[48vh] flex-col justify-start px-6 py-8 sm:px-10 lg:min-h-screen lg:px-12 lg:py-12">
  <div>
    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2d7f8a]">Inpsyt Assessment</p>
    <h1 className="mt-4 max-w-md text-3xl font-bold leading-tight sm:text-4xl">{testName}</h1>
    <p className="mt-4 max-w-[40rem] text-sm leading-6 text-[#5f6f73]">
      검사 시작 전 본인 확인을 진행합니다. 응답은 제출 후 결과 산출과 관리자 확인에 사용됩니다.
    </p>
  </div>

  {/* ▼ 추가 */}
  <ResearchNotice />
</div>
```

끝입니다. 별도 상태 관리 불필요 — 펼침/접힘은 `ResearchNotice` 내부 `useState` 로 처리됩니다.

---

## 동작 / 디자인 메모

- **기본 접힘**: 첫 화면은 안내문 + 참여 혜택 + "제공되는 검사 3종 · 자세히 보기" 토글 바까지만 보여 깔끔합니다.
- **클릭 시 펼침**: PAT-2 · K-PSI-4-SF · PCT 카드(이름 + 소개)가 `max-height` 트랜지션으로 한 번에 열립니다(접기 가능).
- 좌측 컬럼은 기존처럼 내용이 길어지면 페이지가 스크롤됩니다(별도 inner-scroll 없음).
- 토큰: assessment teal(`#175e63`, accent `#5ce1e6`, soft `#e8f3f1`), border `#dfe5e3`/`#e8eded`, Pretendard. 새 색 추가 없음.
- 아이콘: `@tabler/icons-react` 의 `IconChevronDown` (코드베이스 단일 아이콘 시스템 준수).
- 한글 줄바꿈: `[word-break:keep-all]` 로 외톨이 글자 방지.

## 데이터 분리(선택)

지금은 안내문/혜택/검사 3종을 `ResearchNotice.tsx` 상단 상수로 두었습니다.
검사·세션마다 문구가 달라져야 하면, 이 값들을 관리자 설정
(`session.description`, 별도 config 필드 등)에서 props 로 주입하도록 바꾸면 됩니다.

```tsx
// 예시 시그니처
export function ResearchNotice(props: {
  intro?: string[]
  benefitLines?: string[]
  tests?: { code: string; name: string; desc: string }[]
}) { ... }
```

## 미리보기

디자인/동작 확인용 HTML 목업: `연구 참여 안내 redesign.html` (A · 정돈된 안내 카드).
B·C안도 같은 파일에 비교용으로 남겨 두었습니다.
