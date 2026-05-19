# 검사 생성 모달 Wizard 재디자인 적용

## 목표
Claude Design에서 작성한 `docs/design/Modular Design System/ui_kits/admin/CreateTestModal.v2.jsx` 를 실제 production 코드(`frontend/src/pages/TestManagement.tsx`)에 적용한다.

## 변경 범위
- 파일: `frontend/src/pages/TestManagement.tsx`
- 변경 영역: 검사 생성 모달 JSX (기존 lines 1022~1401)
- 상태/핸들러/API: 변경 없음

## 구체 작업

### 1. 아이콘 import 추가
- `IconChevronLeft`, `IconCheck`, `IconX` 추가

### 2. STEPS 상수 추가
컴포넌트 밖에 `const STEPS` 정의:
1. 기본 정보 / 2. 검사 선택 / 3. 세션 구성 / 4. 척도 선택 / 5. 추가 인적사항

### 3. createStep 상태 추가
- `const [createStep, setCreateStep] = React.useState(1)`
- `resetCreateForm` 에 `setCreateStep(1)` 추가

### 4. 모달 JSX 교체 (핵심)
기존 dense 2-column → 5단계 wizard:

**레이아웃:**
```
section.max-w-5xl
  header (제목 + X 닫기 버튼)
  form
    div.grid-cols-[220px_1fr]
      aside (단계 rail — done/active/inactive)
      div.overflow-auto (단계별 콘텐츠)
    footer (힌트 + 이전/다음/생성 버튼)
```

**단계별 콘텐츠 소스:**
- Step 1 (기본 정보): 기존 lines 1032~1072 인라인
- Step 2 (검사 선택): 기존 lines 1074~1095 인라인
- Step 3 (세션 구성): 기존 lines 1097~1190 → 좌(칩)/우(드롭존) split 레이아웃으로 개선
- Step 4 (척도 선택): 기존 lines 1234~1290 인라인 (renderScaleNodes 그대로)
- Step 5 (추가 인적사항): 기존 lines 1292~1381 인라인

**제거 항목:**
- `구성 요약` 섹션 (v2 설계서 기준 제거)
- 기존 2-column grid 컨테이너

**유지 항목:**
- 모든 상태, 핸들러, API 호출
- form/handleCreate 구조 — 마지막 단계 "생성" 버튼만 type="submit"
- pendingPayload/missingVariants 확인 모달 (lines 1403~1427) 무수정

## 검증 계획
1. 서버/클라이언트 빌드 오류 없음
2. 모달 열기 → 단계 이동 (이전/다음/클릭) 정상 동작
3. 검사 선택 → 세션 구성 드래그앤드롭 동작
4. 척도 트리 체크박스 동작
5. 생성 버튼 → handleCreate 정상 호출
6. 모달 닫기 → resetCreateForm (step 1로 리셋) 확인
7. 스크린샷 전/후 비교

## Quality Score

- Requirement Fit: 5/5 — v2 설계서 모든 요소 적용 (5단계 wizard, left rail, 헤더 X버튼, 푸터 이전/다음/생성)
- Functional Correctness: 5/5 — 5단계 이동, 빈 상태 처리, 생성 버튼 type=submit 정상 동작
- Architectural Consistency: 5/5 — 별도 컴포넌트 추출 없이 인라인, 기존 핸들러/상태 보존
- Readability And Maintainability: 4/5 — step별 JSX 블록이 명확하게 구분됨
- Validation And Testing: 4/5 — TypeScript 타입 검사 통과, 5단계 스크린샷 전부 확인
- Edge Case Handling: 4/5 — 검사 미선택 시 세션/척도 빈 상태, 닫기 시 step 리셋 코드 확인
- Documentation Quality: 4/5 — exec plan 작성
- UI And Design Consistency: 5/5 — admin palette 준수, teal 미사용, 디자인 시스템 규칙 일치
- Regression Risk: 4/5 — 모달 JSX만 교체, 핸들러/API/상태/missingVariants 모달 무수정
- Completion Level: 5/5 — 5단계 전부 스크린샷 검증 완료

### Summary
- Average: 4.5/5
- 스크린샷 기록: artifacts/screenshots/wizard-step1~5.png
