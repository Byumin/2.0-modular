# Code Cleanup Doc Hardening

## Goal
- 인터랙션 웹 산출물에서 반복된 품질 문제를 문서 규칙으로 승격한다.
- 다음 `코드 정리` 요청에서 같은 실수가 다시 나오지 않도록 `spec`, `playbook`, 문서 허브, 템플릿 안내를 강화한다.

## Initial Hypothesis
- 현재 문서는 큰 방향은 맞지만, 실제 artifact에서 반복된 실수인 `절대 refs`, `시나리오 시각 구분 부족`, `엣지 방향성 부족`, `detail-panel overflow`, `legend 누락`, `fold affordance 누락` 같은 항목을 직접 금지하지 않는다.
- 이 항목을 명시하면 Claude/Codex 산출물 편차를 줄일 수 있다.

## Plan
1. `interactive-flow-spec.md`에 산출물 필수 시각 규칙을 보강한다.
2. `code-cleanup/playbook.md`에 실패 조건과 최종 체크리스트를 구체화한다.
3. `code-cleanup/README.md`에 새로 확인해야 하는 품질 포인트를 추가한다.
4. 필요하면 `AGENTS.md`의 `Code Cleanup Rule`에도 핵심 요약을 추가한다.

## Changes During Work
- `interactive-flow-spec.md`에 상대 refs, 시나리오별 시각 구분, edge 화살표, detail panel overflow, legend, fold affordance, hero copy 기준을 추가했다.
- `docs/code-cleanup/playbook.md`에 위 항목들을 `Mandatory Quality Bar`, `Failure Conditions`, `Reference-Derived Guardrails`, `Final Review Checklist`로 올렸다.
- `docs/code-cleanup/README.md`에 빠르게 확인할 수 있는 `Quick Guardrails`를 추가했다.
- `AGENTS.md`의 `Code Cleanup Rule`에도 핵심 시각 규칙 요약을 추가했다.
- `docs/code-cleanup/templates/interactive-flow-template.html`에도 시나리오별 chip 색, edge marker/활성 색, sticky detail panel overflow, fold-card 표시, callout empty 처리, 상대 refs placeholder를 기본값으로 반영했다.

## Final Result
- 이후 `코드 정리` 요청은 기존 구조 문서뿐 아니라, 실제 artifact에서 드러난 실패 패턴까지 포함한 더 강한 기준을 따르게 되었다.
- 문서 기준뿐 아니라 템플릿 HTML 자체도 반복 실수 방지용 기본값을 가지게 되었다.

## Retrospective
- 문서 규칙과 템플릿 기본값을 같이 올려야 실제 생성 편차가 줄어든다. 이후에도 품질이 흔들리면 템플릿에 JS placeholder 예시까지 더 강하게 넣는 쪽이 다음 단계다.
