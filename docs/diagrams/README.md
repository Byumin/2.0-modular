# Runtime Flow Diagrams

## Files
- `assessment-profile-runtime-sequence.mmd`: 인적사항 화면부터 validate-profile 이후 문항 렌더까지의 시퀀스 다이어그램
- `assessment-profile-validate-flow.mmd`: validate-profile 내부 함수 호출/분기 플로우
- `custom-test-create-runtime-sequence.mmd`: 커스텀 검사 생성(프론트 submit -> 백엔드 저장 -> 목록 갱신) 시퀀스 다이어그램
- `custom-test-create-service-flow.mmd`: `create_admin_custom_test_batch` 내부 처리 플로우

## Render commands
```bash
npx mmdc -i docs/diagrams/assessment-profile-runtime-sequence.mmd -o docs/diagrams/assessment-profile-runtime-sequence.svg -b transparent
npx mmdc -i docs/diagrams/assessment-profile-validate-flow.mmd -o docs/diagrams/assessment-profile-validate-flow.svg -b transparent
npx mmdc -i docs/diagrams/custom-test-create-runtime-sequence.mmd -o docs/diagrams/custom-test-create-runtime-sequence.svg -b transparent
npx mmdc -i docs/diagrams/custom-test-create-service-flow.mmd -o docs/diagrams/custom-test-create-service-flow.svg -b transparent
```

또는

```bash
npm run diagram:render
```
