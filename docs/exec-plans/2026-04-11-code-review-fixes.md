# 코드 리뷰 수정 작업

## 작업 목표
Playwright 기반 전체 리뷰에서 발견된 3~11번 이슈 수정.
1번(세션 메모리), 2번(SHA256)은 security-debt.md에 기록 후 나중에 처리.

## 수정 목록
- [x] 3. ProfileStep - `noValidate` 추가 (영어 validation 메시지 제거)
- [x] 4. TestDetail - 검사명·구성 정보 표시 (API 필드명 수정: custom_test_name, selected_scale_codes)
- [x] 5. CompleteStep - "다시 확인하기" → "처음으로" 레이블
- [x] 6. LikertCard - ARIA 중복 제거 (label에서 role/aria-checked/onKeyDown 제거)
- [x] 7. ClientManagement - 행 전체 클릭 가능하게 (useNavigate + cursor-pointer + onClick)
- [x] 8. Dashboard - 차트 범례/레이블 추가 (막대 위 count 숫자 표시)
- [x] 9. QuestionStep - useMemo 최적화 (total/done/allAnswered/partAllAnswered)
- [x] 10. CompleteStep - "완료" 텍스트 → 체크 SVG 아이콘
- [x] 11. ClientDetail - "결과 보기" 미실시 시 비활성화 (assessment_logs 체크)

## 최종 결과
모든 이슈(3~11) 수정 완료. 1번·2번은 docs/debug/security-debt.md에 기록됨.
