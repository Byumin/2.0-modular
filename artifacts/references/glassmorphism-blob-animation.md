# Glassmorphism Blob Animation 레퍼런스

## 출처
- **Primary**: [Blob Animation And Glassmorphism with CSS](https://codepen.io/thedevenv/pen/JjrXayd) — thedevenv (CodePen, 직접 접근 403)
- **보조**: [css blob keyframe gist](https://gist.github.com/EminQasimov/b4ed035b0c878a936bb4ca6ee6c99a89)
- **보조**: [CSS Blob Effect Examples](https://www.subframe.com/tips/css-blob-effect-examples)
- **보조**: [Animated CSS Blob](https://www.aworkinprogress.dev/animated-css-blob)

## 핵심 기법

### 1. Blob 형태 — border-radius 모핑
단순 `rounded-full`(50%)이 아니라 4-value border-radius 문법으로 유기적 형태 변형.
```css
/* 형식: top-left top-right bottom-right bottom-left / 수직방향 4값 */
border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
```
keyframe에서 이 값을 계속 바꿔주면 살아있는 blob 느낌.

### 2. Blob 블러 — filter vs backdrop-filter
- **`filter: blur(50-80px)`**: blob 자체를 흐리게 → 경계가 번지는 효과 (올바른 방식)
- **`blur-3xl` (Tailwind)**: 동일하나 고정값
- backdrop-filter는 blob이 아닌 glass 카드/구체에만 사용

### 3. Mix Blend Mode
```css
mix-blend-mode: multiply; /* 또는 screen */
```
블롭이 겹칠 때 색이 자연스럽게 섞이는 깊이감 연출. 배경이 밝은 회색일 때 `multiply` 권장.

### 4. Glass 구체 핵심 속성
```css
backdrop-filter: blur(12-20px);
-webkit-backdrop-filter: blur(12-20px);
background: rgba(255,255,255,0.08-0.15);
border: 1px solid rgba(255,255,255,0.25-0.4);
box-shadow:
  inset 0 1px 40px rgba(255,255,255,0.4),   /* 상단 내부 하이라이트 */
  inset 0 -4px 20px rgba(180,210,220,0.1),  /* 하단 내부 색조 */
  0 30px 80px rgba(60,90,110,0.2);           /* 외부 그림자 깊이 */
```

### 5. 애니메이션 구조 — morph + float 분리
blob마다 두 keyframe을 조합:
- `blob-morph-N`: border-radius 변형만 (8-14s linear infinite alternate)
- `blob-float-N`: translate + scale (9-13s ease-in-out infinite)
→ `animation: blob-morph-1 10s linear infinite alternate, blob-float-1 9s ease-in-out infinite`

### 6. 권장 수치 (실측)
| 항목 | 값 |
|---|---|
| blob 색 opacity | 15-25% |
| blob filter blur | 50-80px |
| 애니메이션 duration | 9-14s |
| glass backdrop-filter | blur(16px) |
| glass bg opacity | 8-12% |
| glass border opacity | 25-40% |
| 이동 범위 (translate) | 80-150px |

## 적용 위치
- `frontend/src/index.css` — keyframes, .hero-blob, .hero-glass 클래스
- `frontend/src/pages/assessment/steps/ProfileStep.tsx` — hero section
