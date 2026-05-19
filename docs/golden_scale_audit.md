# GOLDEN Scale Audit

## 목적
- `parent_scale.test_id = 'GOLDEN'` 에서 반대 facet 쌍이 같은 문항을 공유하는 구조를 검토한다.
- 같은 문항을 공유하는 반대 facet 쌍은 한쪽 facet의 `choice_score`를 item 단위로 역전해야 할 가능성이 있다.
- 다만 facet 전체를 통째로 reverse 할 수 있는지, 아니면 item 단위 판정이 필요한지 구분한다.

## 현재 확인한 사실
- 성인형 GOLDEN variant와 아동형 GOLDEN variant 모두 반대 facet 쌍이 같은 item_id를 공유한다.
- 현재 DB의 `choice_score`는 공유 문항에 대해 양쪽 facet 모두 같은 방향 점수표를 갖고 있다.
- 이 상태면 같은 응답이 반대 facet 양쪽에서 동시에 같은 방향으로 고득점이 될 수 있다.

## 위험 포인트
- 일부 facet 쌍은 같은 facet 안에서도 문항마다 좌/우 앵커 방향이 섞여 있다.
- 이 경우 facet 전체를 통째로 reverse 하면 일부 문항은 맞고 일부 문항은 틀린다.
- 즉 `facet 단위 reverse`가 아니라 `item 단위 reverse`가 필요하다.

## 성인형 예시

### E1 / I1
- 공유 문항: `1, 28, 132, 134, 141, 157`
- item `1`
  - 문항: `처음 만난 사람들과 있게 되면, 나는`
  - 좌측 보기: `말을 적게 하는 편이다.`
  - 우측 보기: `말을 많이 하는 편이다.`
- 해석:
  - `E1 말이 많은` 과 `I1 조용한` 은 같은 문항을 공유하지만, 한쪽은 우측 direct, 다른 한쪽은 좌측 direct 여야 한다.
  - 이 쌍은 item 단위 reverse가 명확하다.

### E3 / I3
- 공유 문항: `6, 44, 57, 66, 79, 102, 104`
- item `6`
  - 문항: `모임에서 떠나려 할 때, 나는`
  - 좌측 보기: `그냥 말없이 떠날 것이다.`
  - 우측 보기: `작별인사를 하는 데 많은 시간을 들일 것이다.`
- item `44`
  - 문항: `내가 선호하는 업무환경은`
  - 좌측 보기: `내 주변 사람들과 함께 일하는 곳이다.`
  - 우측 보기: `혼자서 일하는 곳이다.`
- item `57`
  - 문항: `내가 살고 싶은 곳은`
  - 좌측 보기: `평화롭고 조용하며 많은 일들이 일어나지 않는 곳이다.`
  - 우측 보기: `볼거리와 할 것들이 많은 곳이다.`
- 해석:
  - `6`과 `57`만 보면 우측이 더 `E3` 쪽처럼 읽힌다.
  - `44`는 좌측이 더 `E3` 쪽처럼 읽힌다.
  - 즉 같은 facet 쌍 안에서도 item별 방향이 섞여 있다.
  - 이 쌍은 facet 전체 reverse가 불가능하고 item 단위 판정이 필요하다.

### O2 / A2
- 공유 문항: `10, 12, 43, 60, 68, 71, 86, 94, 99, 107`
- item `10`
  - 문항: `일과 관련하여 대부분의 사람들은 나를`
  - 좌측 보기: `마감 시간이 임박해야 일을 시작하는 사람이라고 말한다.`
  - 우측 보기: `가장 먼저 일을 시작하는 사람이라고 말한다.`
- item `12`
  - 문항: `지출 계획을 세울 때, 나는`
  - 좌측 보기: `계획을 세우고, 이를 지키고자 노력한다.`
  - 우측 보기: `계획에 없었더라도 내가 원하는 것이 생기면 구매한다.`
- item `60`
  - 문항: `약속이 있을 때, 나는`
  - 좌측 보기: `교통체증 때문에 늦을 것만 같은 상황에도 평소 시간대로 출발한다.`
  - 우측 보기: `늦을 경우를 대비하여 일찍 출발한다.`
- 해석:
  - `10`, `60`은 우측이 더 `O2` 쪽처럼 읽힌다.
  - `12`는 좌측이 더 `O2` 쪽처럼 읽힌다.
  - 이 쌍도 facet 전체 reverse가 불가능하고 item 단위 판정이 필요하다.

## 아동형 예시

### E1 / I1
- 공유 문항: `1, 6, 44, 49`
- item `1`
  - 문항: `나는 처음 만난 사람들과 있게 되면,`
  - 좌측 보기: `말을 많이 하는 편이다.`
  - 우측 보기: `말을 적게 하는 편이다.`
- 해석:
  - 성인형과 좌우가 반대로 저장되어 있다.
  - variant별로도 item 단위 판정을 따로 해야 한다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/golden_shared_item_audit.md](/mnt/c/Users/user/workspace/2.0-modular/docs/golden_shared_item_audit.md)
- [docs/features/scoring-flow.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/scoring-flow.md)
- [docs/database/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/README.md)

### Tense1 / Calm1
- 공유 문항: `5, 10, 15, 48`
- item `5`
  - 문항: `나는 어떤 문제가 생겼을 때,`
  - 좌측 보기: `그 문제가 심각해질까 봐 염려한다.`
  - 우측 보기: `어떻게든 해결될 것이라고 기대한다.`
- 해석:
  - 이 쌍은 상대적으로 방향이 명확한 편이다.
  - 하지만 전체 수정 시에도 item 단위로 처리하는 방식이 안전하다.

## 결론
- `GOLDEN`은 반대 facet 쌍이 공유 문항을 쓰는 구조이므로, 현재의 동일 방향 `choice_score`는 수정 대상이다.
- 하지만 자동 규칙을 `facet 전체 reverse`로 두면 잘못 수정될 가능성이 높다.
- 안전한 수정 단위는 `variant + facet pair + item_id` 이다.
- 다음 단계는 item별 direct facet / reverse facet 매핑표를 먼저 확정하는 것이다.
