/**
 * @file AssessmentPreview.tsx
 * @description 검사 실시 화면 — 카드형(QuestionStep) / 집중형(QuestionEditorial) 전환
 *
 * ## 레이아웃 (카드형)
 * - compact sticky 헤더: 검사명 + 3단계 stepper + progress bar
 * - grid lg:grid-cols-[1fr_220px]
 *   - 좌측: 페이지 인디케이터 + 문항 카드 (PAGE_SIZE=4, 5점 리커트 가로)
 *   - 우측 사이드바 (sticky top-16, 220px):
 *     진행률 도넛 → 문항 이동 → 빠른 이동(5열, max-h-88px) → 모드 토글 → 제출
 * - 카드 아래 이전/다음 버튼 없음, 사이드바에서만 페이지 전환
 * - 페이지 인디케이터와 "진행 현황" 라벨이 동일 높이 시작
 *
 * ## 레이아웃 (집중형)
 * - 풀스크린 1문항, 응답 시 350ms 후 자동 이동
 * - 키보드: 1~5 응답, ←→ 이동
 * - 하단 fixed dot navigation
 *
 * ## 디자인 토큰
 * Primary: #175e63, hover: #124b4f
 * BG(카드형): #f0f2f5, BG(집중형): #fafbfc
 * Heading: #161d1b, Body: #5f6f73, Muted: #8a9a96, Subtle: #b0bab7
 * Border: #e8ebee(카드), #e2e8f0(옵션), Divider: #edf0ef
 *
 * ## 데이터
 * QuestionItem { id, order, text }
 * ResponseOption { value, label } (5점 리커트)
 * Answers = Record<string, string>
 */
import * as React from "react";
import { QuestionEditorial } from "./QuestionEditorial";
import { ProfileStep } from "./ProfileStep";
import { ProfileStepLight } from "./ProfileStepLight";
import { ProfileStepTeal } from "./ProfileStepTeal";

type QuestionDesign = "original" | "editorial";
type Screen = "profile" | "question";
type ProfileVariant = "dark" | "light" | "teal";

// ── 샘플 문항 데이터 ──────────────────────────────────────────────
const SAMPLE_OPTIONS = [
  { value: "1", label: "전혀 그렇지 않다" },
  { value: "2", label: "그렇지 않다" },
  { value: "3", label: "보통이다" },
  { value: "4", label: "그렇다" },
  { value: "5", label: "매우 그렇다" },
];

const SAMPLE_ITEMS = [
  { id: "q1", order: 1, text: "나는 새로운 사람을 만나는 것이 즐겁다." },
  { id: "q2", order: 2, text: "나는 혼자 있는 시간을 좋아한다." },
  { id: "q3", order: 3, text: "나는 계획을 세우고 그 계획을 따르는 것을 선호한다." },
  { id: "q4", order: 4, text: "나는 어려운 상황에서도 침착함을 유지한다." },
  { id: "q5", order: 5, text: "나는 변화를 받아들이는 편이다." },
  { id: "q6", order: 6, text: "나는 다른 사람의 감정을 잘 이해한다." },
  { id: "q7", order: 7, text: "나는 창의적인 활동을 즐긴다." },
  { id: "q8", order: 8, text: "나는 규칙과 절차를 중요하게 생각한다." },
];

// ── QuestionStep (카드형) ──────────────────────────────────────────
function QuestionStep({
  onSubmit,
  onDesignChange,
  currentDesign,
}: {
  onSubmit: () => void;
  onDesignChange?: (d: QuestionDesign) => void;
  currentDesign?: QuestionDesign;
}) {
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [page, setPage] = React.useState(0);
  const [showMissing, setShowMissing] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const PAGE_SIZE = 4;
  const totalPages = Math.ceil(SAMPLE_ITEMS.length / PAGE_SIZE);
  const currentItems = SAMPLE_ITEMS.slice(
    page * PAGE_SIZE,
    page * PAGE_SIZE + PAGE_SIZE,
  );

  const done = Object.values(answers).filter(Boolean).length;
  const total = SAMPLE_ITEMS.length;
  const percent = Math.round((done / total) * 100);
  const allAnswered = done === total;

  function handleAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    setShowMissing(false);
  }

  function handleSubmitClick() {
    if (!allAnswered) {
      setShowMissing(true);
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onSubmit();
    }, 800);
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      {/* ── Compact sticky header ── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-[#e8ebee]">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-5 py-3">
          {/* Left: title + meta */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#175e63] text-sm font-bold text-white">
              H
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#161d1b] truncate">
                하네스 엔지니어링 심리검사
              </p>
              <p className="text-[11px] text-[#8a9a96]">
                홍길동 · 파트 1
              </p>
            </div>
          </div>

          {/* Center: stepper */}
          <nav className="hidden sm:flex items-center gap-1 ml-auto">
            {["인적사항", "검사 실시", "제출 완료"].map(
              (label, i) => {
                const past = i === 0;
                const current = i === 1;
                return (
                  <React.Fragment key={label}>
                    <div
                      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${
                        current
                          ? "bg-[#175e63]/10 font-semibold text-[#175e63]"
                          : past
                            ? "text-[#8a9a96]"
                            : "text-[#c5ccc9]"
                      }`}
                    >
                      <div
                        className={`flex size-4.5 items-center justify-center rounded-full text-[9px] font-bold ${
                          current
                            ? "bg-[#175e63] text-white"
                            : past
                              ? "bg-[#c5ccc9] text-white"
                              : "border border-[#dfe5e3] text-[#c5ccc9]"
                        }`}
                      >
                        {past ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="size-2.5"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          String(i + 1)
                        )}
                      </div>
                      {label}
                    </div>
                    {i < 2 && (
                      <div
                        className={`h-px w-5 ${past ? "bg-[#c5ccc9]" : "bg-[#e8ebee]"}`}
                      />
                    )}
                  </React.Fragment>
                );
              },
            )}
          </nav>
        </div>
        {/* Progress bar */}
        <div className="h-0.5 bg-[#edf0ef]">
          <div
            className="h-full bg-[#175e63] transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </header>

      {/* ── Main content ── */}
      <div className="mx-auto max-w-5xl px-5 py-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_220px] items-start">
          {/* Question cards */}
          <div className="flex flex-col gap-4">
            {/* Page indicator */}
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[#175e63]">
                  파트 1
                </span>
                <span className="text-[11px] text-[#b0bab7]">
                  페이지 {page + 1} / {totalPages}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#8a9a96]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-3.5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
                가장 가까운 응답을 선택하세요
              </div>
            </div>

            {/* Cards */}
            {currentItems.map((item, cardIdx) => {
              const isMissing = showMissing && !answers[item.id];
              const isAnswered = !!answers[item.id];
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border-2 bg-white p-6 transition-all ${
                    isMissing
                      ? "border-red-300 ring-2 ring-red-100"
                      : isAnswered
                        ? "border-[#175e63]/15 shadow-sm"
                        : "border-transparent shadow-sm hover:shadow-md"
                  }`}
                  style={{ animationDelay: `${cardIdx * 60}ms` }}
                >
                  <div className="flex items-start gap-4">
                    {/* Number badge */}
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-colors ${
                        isAnswered
                          ? "bg-[#175e63] text-white"
                          : "bg-[#f0f2f5] text-[#8a9a96]"
                      }`}
                    >
                      {item.order}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] leading-relaxed text-[#1a2420]">
                        {item.text}
                      </p>

                      {/* Options — horizontal scale */}
                      <div className="mt-5 flex gap-2">
                        {SAMPLE_OPTIONS.map((opt) => {
                          const sel = answers[item.id] === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => handleAnswer(item.id, opt.value)}
                              className={`group relative flex-1 rounded-xl border-2 py-3 text-center transition-all duration-150 ${
                                sel
                                  ? "border-[#175e63] bg-[#175e63] text-white shadow-md shadow-[#175e63]/15"
                                  : "border-[#e8ebee] bg-[#fafbfc] text-[#8a9a96] hover:border-[#175e63]/30 hover:bg-[#f0f6f5] hover:text-[#175e63]"
                              }`}
                            >
                              <span className="block text-sm font-bold">
                                {opt.value}
                              </span>
                              <span
                                className={`block mt-0.5 text-[10px] ${sel ? "text-white/75" : "text-[#b0bab7] group-hover:text-[#175e63]/60"}`}
                              >
                                {opt.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Answered indicator line */}
                  {isAnswered && (
                    <div className="mt-4 flex items-center gap-2 pl-14">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#175e63"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="size-3.5"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span className="text-[11px] font-medium text-[#175e63]">
                        응답 완료
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Validation error */}
            {showMissing && !allAnswered && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-600">
                모든 문항에 응답해주세요.
              </div>
            )}
          </div>

          {/* ── Compact sidebar ── */}
          <aside className="hidden lg:block h-fit sticky top-16">
            {/* Sidebar label — same row height as page indicator */}
            <div className="flex items-center mb-4">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[#175e63]">
                진행 현황
              </span>
            </div>

            <div className="rounded-2xl bg-white shadow-sm p-4">
              {/* Circular progress */}
              <div className="flex flex-col items-center py-2">
                <div className="relative size-20">
                  <svg viewBox="0 0 36 36" className="size-20 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#edf0ef" strokeWidth="2.5" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#175e63" strokeWidth="2.5" strokeDasharray={`${percent} ${100 - percent}`} strokeLinecap="round" className="transition-all duration-500" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-[#161d1b]">{percent}%</span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-[#8a9a96]">{done}/{total} 문항 완료</p>
                <span
                  className={`mt-2 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                    allAnswered ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"
                  }`}
                >
                  {allAnswered ? "응답 완료" : `미응답 ${total - done}개`}
                </span>
              </div>

              {/* Item navigator: 이전 < 문항번호 > 다음 */}
              <div className="mt-3 border-t border-[#f0f2f5] pt-3">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-[#b0bab7]">문항 이동</p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="flex size-8 items-center justify-center rounded-lg border border-[#e8ebee] bg-[#fafbfc] text-[#8a9a96] transition-colors hover:bg-[#f0f2f5] hover:text-[#175e63] disabled:opacity-30"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5"><polyline points="15 18 9 12 15 6" /></svg>
                  </button>
                  <div className="flex-1 text-center">
                    {(() => {
                      const firstUnanswered = SAMPLE_ITEMS.findIndex((item) => !answers[item.id]);
                      const currentQ = firstUnanswered >= 0 ? firstUnanswered + 1 : total;
                      return (
                        <>
                          <span className="text-xs text-[#8a9a96]">문항 </span>
                          <span className="text-sm font-bold text-[#161d1b]">{currentQ}</span>
                          <span className="text-[11px] text-[#b0bab7]"> / {total}</span>
                        </>
                      );
                    })()}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="flex size-8 items-center justify-center rounded-lg border border-[#e8ebee] bg-[#fafbfc] text-[#8a9a96] transition-colors hover:bg-[#f0f2f5] hover:text-[#175e63] disabled:opacity-30"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5"><polyline points="9 18 15 12 9 6" /></svg>
                  </button>
                </div>
              </div>

              {/* Quick nav — compact scrollable strip */}
              <div className="mt-3 border-t border-[#f0f2f5] pt-3">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-[#b0bab7]">빠른 이동</p>
                <div className="max-h-[88px] overflow-y-auto overflow-x-hidden rounded-lg scrollbar-thin">
                  <div className="grid grid-cols-5 gap-1">
                    {SAMPLE_ITEMS.map((item, idx) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setPage(Math.floor(idx / PAGE_SIZE))}
                        className={`h-6 rounded text-[10px] font-semibold transition-all ${
                          answers[item.id]
                            ? "bg-[#175e63] text-white"
                            : page === Math.floor(idx / PAGE_SIZE)
                              ? "bg-[#175e63]/10 text-[#175e63] ring-1 ring-[#175e63]/20"
                              : "bg-[#f5f7fa] text-[#8a9a96] hover:bg-[#edf0ef]"
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Design switcher */}
              {onDesignChange && (
                <div className="mt-3 border-t border-[#f0f2f5] pt-3">
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-[#b0bab7]">응답 방식</p>
                  <div className="flex gap-1">
                    {([
                      { key: "original" as QuestionDesign, label: "카드형" },
                      { key: "editorial" as QuestionDesign, label: "집중형" },
                    ]).map((d) => (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => onDesignChange(d.key)}
                        className={`flex-1 rounded-lg py-2 text-[11px] font-semibold transition-all ${
                          currentDesign === d.key
                            ? "bg-[#175e63] text-white"
                            : "bg-[#f5f7fa] text-[#8a9a96] hover:bg-[#edf0ef] hover:text-[#5f6f73]"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit */}
              <div className="mt-3 border-t border-[#f0f2f5] pt-3">
                <button
                  type="button"
                  onClick={handleSubmitClick}
                  disabled={submitting || !allAnswered}
                  className="h-10 w-full rounded-xl bg-[#175e63] text-sm font-semibold text-white transition-all hover:bg-[#124b4f] disabled:opacity-30"
                >
                  {submitting ? "제출 중..." : "제출하기"}
                </button>
                {!allAnswered && (
                  <p className="mt-1.5 text-center text-[10px] text-[#b0bab7]">
                    모든 문항 응답 후 제출
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ── 메인 래퍼: 검사 실시 화면만 렌더링 ──────────────────────────────
export function AssessmentPreview() {
  const [screen, setScreen] = React.useState<Screen>("profile");
  const [questionDesign, setQuestionDesign] =
    React.useState<QuestionDesign>("original");
  const [profileVariant, setProfileVariant] = React.useState<ProfileVariant>("light");

  function handleSubmit() {
    alert("검사가 제출되었습니다.");
  }

  if (screen === "profile") {
    const onNext = () => setScreen("question");
    return (
      <div className="relative">
        {/* Floating variant toggle */}
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-1 rounded-2xl border border-black/10 bg-white/90 p-1 shadow-xl" style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
          <span className="px-2 text-[10px] font-semibold uppercase tracking-wider text-[#8a9a96]">시안</span>
          {([
            { key: "light" as ProfileVariant, label: "A 라이트", color: "#f0f2f5" },
            { key: "teal" as ProfileVariant, label: "C 딥틸", color: "#0d3b3f" },
            { key: "dark" as ProfileVariant, label: "기존 다크", color: "#0f1b2d" },
          ]).map((v) => (
            <button
              key={v.key}
              onClick={() => setProfileVariant(v.key)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold transition-all ${profileVariant === v.key ? "bg-[#175e63] text-white shadow-md" : "text-[#5f6f73] hover:bg-[#f0f2f5]"}`}
            >
              <span className="size-2.5 rounded-full border border-black/15" style={{ background: v.color }} />
              {v.label}
            </button>
          ))}
        </div>

        {profileVariant === "light" && <ProfileStepLight onNext={onNext} />}
        {profileVariant === "teal" && <ProfileStepTeal onNext={onNext} />}
        {profileVariant === "dark" && <ProfileStep onNext={onNext} />}
      </div>
    );
  }

  if (questionDesign === "editorial") {
    return <QuestionEditorial onSubmit={handleSubmit} onDesignChange={(d) => setQuestionDesign(d as QuestionDesign)} />;
  }

  return (
    <QuestionStep
      onSubmit={handleSubmit}
      onDesignChange={setQuestionDesign}
      currentDesign={questionDesign}
    />
  );
}