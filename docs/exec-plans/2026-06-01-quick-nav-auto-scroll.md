# 실행 계획: 빠른 이동 영역 자동 스크롤 수정

## 문제
카드형 검사 화면에서 왼쪽 문항에 응답할 때 오른쪽 사이드바 **빠른 이동** 영역이 자동으로 스크롤되지 않음.

## 원인
`alignQuickNav` effect의 deps가 `[partIndex, page, currentItems, currentBundle.startIndex]`로만 구성되어 **같은 페이지 내 문항 이동** 시에는 실행되지 않음.

- 페이지 변경 시: `alignQuickNav` effect 트리거 → 정상 동작
- 같은 페이지 내 이동(`handleAnswer` → `moveToItem` → `scrollToQuestion`): effect 미트리거 → 빠른 이동 영역 스크롤 안 됨

## 수정 범위
`frontend/src/pages/assessment/steps/QuestionStep.tsx`

## 변경 내용
`handleAnswer` 함수의 카드형 분기에 같은 페이지 이동 시 `quickNavRef` 스크롤 추가:

```tsx
} else {
  const nextMissing = nextMissingAfterItem(id, updatedAnswers)
  if (nextMissing) {
    moveToItem(nextMissing.item.id, { focus: true })
    // 같은 페이지 이동 시에만 quick nav 스크롤 (다른 페이지는 alignQuickNav effect가 처리)
    const isSamePage = nextMissing.partIndex === partIndexRef.current && nextMissing.page === pageRef.current
    if (isSamePage) {
      window.requestAnimationFrame(() => {
        const nav = quickNavRef.current
        if (!nav) return
        const btn = nav.querySelector<HTMLButtonElement>(`[data-quick-item-id="${nextMissing.item.id}"]`)
        if (!btn) return
        nav.scrollTo({ top: Math.max(0, btn.offsetTop - (btn.offsetHeight + 4) * 2), behavior: "smooth" })
      })
    }
  }
}
```

## 비고
- 페이지 변경 케이스는 기존 `alignQuickNav` effect가 담당하므로 중복 처리 없음
- step 모드는 사이드바 없음 → 변경 없음
- `data-quick-item-id` 속성은 기존 quick nav 버튼에 이미 존재

## 검증
- [ ] 같은 페이지 내 응답 시 빠른 이동 영역이 해당 문항 버튼으로 스크롤되는지 확인
- [ ] 페이지 이동이 발생하는 응답 시 빠른 이동 영역이 정상 동작하는지 확인
