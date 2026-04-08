# Runtime Flow Diagrams

## Files
- `assessment-profile-runtime-sequence.mmd`: 인적사항 화면부터 validate-profile 이후 문항 렌더까지의 시퀀스 다이어그램
- `assessment-question-runtime-sequence.mmd`: validate-profile 이후 실제 문항 조회/조립/렌더 흐름 시퀀스 다이어그램
- `assessment-question-build-flow.mmd`: `build_custom_assessment_question_payload` 내부 처리 플로우
- `assessment-profile-validate-flow.mmd`: validate-profile 내부 함수 호출/분기 플로우
- `custom-test-create-runtime-sequence.mmd`: 커스텀 검사 생성(프론트 submit -> 백엔드 저장 -> 목록 갱신) 시퀀스 다이어그램
- `custom-test-create-service-flow.mmd`: `create_admin_custom_test_batch` 내부 처리 플로우
- `scoring-submission-runtime-sequence.mmd`: submission_id 기준 채점 라우터 호출부터 `ScoringContext` 조립까지의 시퀀스 다이어그램
- `scoring-context-build-flow.mmd`: `build_scoring_context_from_submission` 내부 처리 플로우
- `scoring-choice-score-flow.mmd`: `build_choice_score_result` 내부 처리 플로우
- `scoring-runtime-sequence.mmd`: scoring 엔진 호출부터 scorer 선택/반환까지의 시퀀스 다이어그램
- `scoring-service-flow.mmd`: `ScoringEngine.score_tests` 내부 처리 플로우

## Validate Profile Flow 작성 규칙
- 함수명만 쓰지 않고 `함수명 + 소스 경로`를 함께 표기한다.
- 함수 노드(처리 박스) 내부에 줄바꿈으로 `목적:` 문구를 넣고, 목적 문구는 본문보다 연한 색상으로 표기한다.
- 가능하면 `입력 -> 처리 -> 출력`의 대표 페이로드를 짧게 넣는다.
- 중간 호출 함수는 생략하지 않는다. 특히 `A -> B`로 표시한 함수에서 내부적으로 `B1 -> B2 -> B3`가 실행되면 실제 실행 순서대로 모두 노드로 풀어 쓴다.
- 파싱/정규화/검증/분기(`fallback` 포함)도 생략하지 않고 표시한다.
- 에러 분기는 실제 발생 HTTP 상태 코드와 메시지까지 함께 표기한다.
- 마름모(조건 분기)에는 `분기 함수명 + 소스 경로`를 함께 적어, 어떤 함수에서 해당 조건이 평가되는지 명시한다.
- 한 함수 안에서 여러 동작 함수가 연속 호출되면, 해당 함수 옆에 `함수 내부 순서` 보조 노드를 두고 실행 순서를 나열한다.
- 특정 함수 내부에서만 수행되는 하위 helper 호출은 메인 세로 흐름에서 분리하고, 해당 함수 옆으로 나란히 배치해서 `이 함수 안에서 이렇게 처리된다` 수준으로만 표시한다.
- 위 보조 노드로 뺀 내부 helper 설명 연결은 점선 화살표(`-.->`)를 사용한다.
- 어떤 함수의 반환값이 다른 함수의 인자로 직접 입력되는 관계는 채워진 실선 화살표(`-->`)로 직접 연결한다.
- 내부 helper를 옆으로 분리해 표현한 경우, 같은 helper를 메인 세로 흐름에 별도 박스로 다시 세우지 않는다.
- 어떤 함수의 반환값이 다른 함수 인자로 전달되면, 필요할 때만 `반환 노드 -> 변수 저장 노드 -> 인자 전달 노드`를 수직 연결로 그린다. 단, 단순히 함수 내부 처리 설명만 필요한 helper는 반환 노드를 따로 만들지 않는다.
- 예시 형식:
  - 입력: `{ name, birth_date, gender, school_age }`
  - 처리: `POST /api/assessment-links/{token}/validate-profile -> validate_custom_test_profile_by_access_link(...)`
  - 출력: `{ title, profile, parts[], scales[] }`
- 프론트 후속 처리 함수도 소스와 함께 표기한다. 예: `applyAssessmentPayload (static/assessment-custom.js)`

## Render commands
```bash
npx mmdc -p docs/diagrams/puppeteer-config.json -i docs/diagrams/assessment-profile-runtime-sequence.mmd -o docs/diagrams/assessment-profile-runtime-sequence.svg -b transparent
npx mmdc -p docs/diagrams/puppeteer-config.json -i docs/diagrams/assessment-question-runtime-sequence.mmd -o docs/diagrams/assessment-question-runtime-sequence.svg -b transparent
npx mmdc -p docs/diagrams/puppeteer-config.json -i docs/diagrams/assessment-question-build-flow.mmd -o docs/diagrams/assessment-question-build-flow.svg -b transparent
npx mmdc -p docs/diagrams/puppeteer-config.json -i docs/diagrams/assessment-profile-validate-flow.mmd -o docs/diagrams/assessment-profile-validate-flow.svg -b transparent
npx mmdc -p docs/diagrams/puppeteer-config.json -i docs/diagrams/custom-test-create-runtime-sequence.mmd -o docs/diagrams/custom-test-create-runtime-sequence.svg -b transparent
npx mmdc -p docs/diagrams/puppeteer-config.json -i docs/diagrams/custom-test-create-service-flow.mmd -o docs/diagrams/custom-test-create-service-flow.svg -b transparent
npx mmdc -p docs/diagrams/puppeteer-config.json -i docs/diagrams/scoring-submission-runtime-sequence.mmd -o docs/diagrams/scoring-submission-runtime-sequence.svg -b transparent
npx mmdc -p docs/diagrams/puppeteer-config.json -i docs/diagrams/scoring-context-build-flow.mmd -o docs/diagrams/scoring-context-build-flow.svg -b transparent
npx mmdc -p docs/diagrams/puppeteer-config.json -i docs/diagrams/scoring-choice-score-flow.mmd -o docs/diagrams/scoring-choice-score-flow.svg -b transparent
npx mmdc -p docs/diagrams/puppeteer-config.json -i docs/diagrams/scoring-runtime-sequence.mmd -o docs/diagrams/scoring-runtime-sequence.svg -b transparent
npx mmdc -p docs/diagrams/puppeteer-config.json -i docs/diagrams/scoring-service-flow.mmd -o docs/diagrams/scoring-service-flow.svg -b transparent
```

또는

```bash
npm run diagram:render
```

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/debug/explanation-rule.md](/mnt/c/Users/user/workspace/2.0-modular/docs/debug/explanation-rule.md)
- [ARCHITECTURE.md](/mnt/c/Users/user/workspace/2.0-modular/ARCHITECTURE.md)
- [docs/features/assessment-link-flow.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/assessment-link-flow.md)
- [docs/features/custom-test-management.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/custom-test-management.md)
- [docs/features/scoring-flow.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/scoring-flow.md)
