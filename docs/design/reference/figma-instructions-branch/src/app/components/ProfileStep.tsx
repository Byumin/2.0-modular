import * as React from "react";

const SCHOOL_AGE_OPTIONS = [
  "미취학", "초등 1학년", "초등 2학년", "초등 3학년",
  "초등 4학년", "초등 5학년", "초등 6학년", "초등학교 졸업생",
  "중등 1학년", "중등 2학년", "중등 3학년", "중학교 졸업생",
  "고등 1학년", "고등 2학년", "고등 3학년", "고등학교 졸업생",
  "대학생 재학생", "대학원 재학생",
];

/* ── Animated blob keyframes (injected once) ── */
const blobStyleId = "profile-blob-styles";
if (typeof document !== "undefined" && !document.getElementById(blobStyleId)) {
  const style = document.createElement("style");
  style.id = blobStyleId;
  style.textContent = `
    @keyframes blobMove1 {
      0%   { transform: translate(-80px, -40px) rotate(-90deg); border-radius: 24% 76% 35% 65% / 27% 36% 64% 73%; }
      33%  { transform: translate(200px, 60px) rotate(-30deg); border-radius: 50% 50% 40% 60% / 60% 40% 60% 40%; }
      66%  { transform: translate(350px, -30px) rotate(20deg); border-radius: 60% 40% 55% 45% / 35% 65% 35% 65%; }
      100% { transform: translate(-80px, -40px) rotate(-90deg); border-radius: 24% 76% 35% 65% / 27% 36% 64% 73%; }
    }
    @keyframes blobMove2 {
      0%   { transform: translate(80px, 40px) rotate(30deg); border-radius: 60% 40% 55% 45% / 50% 60% 40% 50%; }
      33%  { transform: translate(-200px, -80px) rotate(-40deg); border-radius: 35% 65% 70% 30% / 45% 30% 70% 55%; }
      66%  { transform: translate(-100px, 100px) rotate(60deg); border-radius: 45% 55% 40% 60% / 55% 45% 55% 45%; }
      100% { transform: translate(80px, 40px) rotate(30deg); border-radius: 60% 40% 55% 45% / 50% 60% 40% 50%; }
    }
    @keyframes blobMove3 {
      0%   { transform: translate(0px, 80px) rotate(0deg); border-radius: 40% 60% 50% 50% / 55% 45% 55% 45%; }
      33%  { transform: translate(180px, -100px) rotate(45deg); border-radius: 55% 45% 35% 65% / 40% 65% 35% 60%; }
      66%  { transform: translate(-150px, -50px) rotate(-30deg); border-radius: 70% 30% 50% 50% / 30% 70% 30% 70%; }
      100% { transform: translate(0px, 80px) rotate(0deg); border-radius: 40% 60% 50% 50% / 55% 45% 55% 45%; }
    }
  `;
  document.head.appendChild(style);
}

interface ProfileStepProps {
  onNext: () => void;
}

/* ── Glass card wrapper ── */
function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/[0.18] p-6 sm:p-8 ${className}`}
      style={{
        background: "rgba(255, 255, 255, 0.10)",
        boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
      }}
    >
      {children}
    </div>
  );
}

export function ProfileStep({ onNext }: ProfileStepProps) {
  const testName = "하네스 엔지니어링 심리검사";

  // State
  const [phase, setPhase] = React.useState<"intro" | "consent" | "form">("intro");
  const [privacyAgreed, setPrivacyAgreed] = React.useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [gender, setGender] = React.useState("");
  const [birthDay, setBirthDay] = React.useState("");
  const [schoolAge, setSchoolAge] = React.useState("");
  const [validationError, setValidationError] = React.useState("");

  function handleConsentNext() {
    if (!privacyAgreed) {
      setValidationError("개인정보 수집 및 이용에 동의해주세요.");
      return;
    }
    setValidationError("");
    setPhase("form");
  }

  function handleSubmit() {
    setValidationError("");
    if (!name.trim()) { setValidationError("이름을 입력해주세요."); return; }
    if (!gender) { setValidationError("성별을 선택해주세요."); return; }
    if (!birthDay) { setValidationError("생년월일을 입력해주세요."); return; }
    if (!schoolAge) { setValidationError("학령을 선택해주세요."); return; }
    onNext();
  }

  /* shared input style */
  const inputCls =
    "h-11 w-full rounded-xl border border-white/[0.18] bg-white/[0.08] px-4 text-sm text-white placeholder:text-white/40 transition-colors focus:border-[#5ce1e6] focus:bg-white/[0.12] focus:outline-none focus:ring-2 focus:ring-[#5ce1e6]/30";

  return (
    <>
      <div
        className="relative min-h-screen overflow-hidden"
        style={{ background: "#0f1b2d", fontFamily: "'Nunito', sans-serif" }}
      >
        {/* ── Animated blobs ── */}
        <div
          className="pointer-events-none absolute"
          style={{
            width: 500,
            height: 500,
            left: "10%",
            top: "5%",
            background: "linear-gradient(180deg, rgba(23,94,99,0.55) 31.77%, #1e8a8a 100%)",
            mixBlendMode: "color-dodge",
            animation: "blobMove1 22s infinite alternate cubic-bezier(0.07,0.8,0.16,1)",
            filter: "blur(60px)",
          }}
        />
        <div
          className="pointer-events-none absolute"
          style={{
            width: 400,
            height: 400,
            right: "5%",
            bottom: "10%",
            background: "linear-gradient(180deg, rgba(92,225,230,0.35) 0%, #175e63 100%)",
            mixBlendMode: "color-dodge",
            animation: "blobMove2 28s infinite alternate cubic-bezier(0.07,0.8,0.16,1)",
            filter: "blur(50px)",
          }}
        />
        <div
          className="pointer-events-none absolute"
          style={{
            width: 350,
            height: 350,
            left: "40%",
            top: "50%",
            background: "linear-gradient(180deg, rgba(30,138,138,0.40) 0%, #5ce1e6 100%)",
            mixBlendMode: "color-dodge",
            animation: "blobMove3 30s infinite alternate cubic-bezier(0.07,0.8,0.16,1)",
            filter: "blur(70px)",
          }}
        />

        {/* ── Top accent line ── */}
        <div className="relative z-10 h-1 bg-gradient-to-r from-[#175e63] via-[#5ce1e6] to-[#175e63]" />

        {/* ── Header (glass) ── */}
        <header
          className="relative z-10 border-b border-white/[0.12]"
          style={{
            background: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
          }}
        >
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-6 py-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#175e63] text-sm font-bold text-white shadow-lg shadow-[#175e63]/40">
              H
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5ce1e6]">
                Inpsyt Assessment
              </p>
              <p className="text-sm font-semibold text-white/90">{testName}</p>
            </div>
          </div>
        </header>

        {/* ── Main content ── */}
        <main className="relative z-10 mx-auto max-w-2xl px-6 py-10">

          {/* ── Phase: Intro ── */}
          {phase === "intro" && (
            <div className="space-y-8">
              {/* Welcome card */}
              <GlassCard className="relative overflow-hidden rounded-3xl">
                <div className="absolute -right-16 -top-16 size-48 rounded-full bg-[#5ce1e6]/[0.08]" />
                <div className="absolute -bottom-8 -left-8 size-32 rounded-full bg-[#175e63]/[0.10]" />
                <div className="relative">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5ce1e6]">
                    <div className="h-px w-6 bg-[#5ce1e6]/50" />
                    검사 안내
                  </div>
                  <h1 className="mt-5 text-[28px] font-bold leading-snug text-white sm:text-[32px]">
                    마음을 이해하는
                    <br />
                    <span className="text-[#5ce1e6]">첫 번째 단계</span>입니다.
                  </h1>
                  <p className="mt-4 max-w-md text-sm leading-7 text-white/60">
                    본 검사는 심리적 특성과 행동 패턴을 파악하기 위한 표준화된 도구입니다.
                    솔직하게 응답해주시면 더 정확한 결과를 얻을 수 있습니다.
                  </p>
                </div>
              </GlassCard>

              {/* Info cards grid */}
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-5">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    ),
                    title: "약 10~15분",
                    desc: "예상 소요 시간",
                  },
                  {
                    icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                    ),
                    title: "총 8문항",
                    desc: "5점 척도 응답",
                  },
                  {
                    icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-5">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    ),
                    title: "정보 보호",
                    desc: "응답은 안전하게 관리",
                  },
                ].map((card) => (
                  <div
                    key={card.title}
                    className="flex flex-col items-center gap-3 rounded-2xl border border-white/[0.15] px-4 py-6 text-center"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      backdropFilter: "blur(14px)",
                      WebkitBackdropFilter: "blur(14px)",
                      boxShadow: "0 4px 20px 0 rgba(31,38,135,0.25)",
                    }}
                  >
                    <div className="flex size-11 items-center justify-center rounded-xl bg-[#5ce1e6]/[0.15] text-[#5ce1e6]">
                      {card.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{card.title}</p>
                      <p className="mt-0.5 text-xs text-white/50">{card.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Guidelines */}
              <GlassCard>
                <h3 className="text-sm font-semibold text-white">검사 안내사항</h3>
                <ul className="mt-4 space-y-3">
                  {[
                    "정답이나 오답이 없습니다. 평소 자신의 모습에 가장 가까운 응답을 선택하세요.",
                    "너무 오래 고민하지 마시고, 첫 번째 느낌으로 응답해주세요.",
                    "검사 도중 중단하더라도 응답은 자동 저장됩니다.",
                    "모든 문항에 응답해야 결과를 확인할 수 있습니다.",
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#5ce1e6]/[0.15] text-[10px] font-bold text-[#5ce1e6]">
                        {i + 1}
                      </span>
                      <span className="text-sm leading-6 text-white/60">{text}</span>
                    </li>
                  ))}
                </ul>
              </GlassCard>

              {/* Start button */}
              <button
                type="button"
                onClick={() => setPhase("consent")}
                className="group flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#175e63] to-[#1e8a8a] text-base font-semibold text-white shadow-lg shadow-[#175e63]/40 transition-all hover:shadow-xl hover:shadow-[#5ce1e6]/30 active:scale-[0.99]"
              >
                검사 시작하기
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 transition-transform group-hover:translate-x-0.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          )}

          {/* ── Phase: Consent ── */}
          {phase === "consent" && (
            <div className="space-y-6">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-xs text-white/40">
                <button onClick={() => setPhase("intro")} className="hover:text-[#5ce1e6] transition-colors">검사 안내</button>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3"><polyline points="9 18 15 12 9 6" /></svg>
                <span className="font-medium text-white/80">개인정보 동의</span>
              </div>

              <GlassCard>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-[#5ce1e6]/[0.15] text-[#5ce1e6]">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-5">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">개인정보 수집 및 이용 동의</h2>
                    <p className="text-xs text-white/40">검사 진행을 위해 아래 내용을 확인해주세요.</p>
                  </div>
                </div>

                {/* Consent content */}
                <div className="mt-6 max-h-[240px] overflow-y-auto rounded-xl border border-white/[0.10] bg-white/[0.05] p-5 text-sm leading-7 text-white/60">
                  <p className="font-semibold text-white/80">1. 수집 항목</p>
                  <p>이름, 성별, 생년월일, 학령 및 검사 응답 결과</p>
                  <p className="mt-3 font-semibold text-white/80">2. 수집 목적</p>
                  <p>심리검사 결과 산출, 내담자 관리, 결과 조회 및 관리자 확인</p>
                  <p className="mt-3 font-semibold text-white/80">3. 보유 기간</p>
                  <p>기관 내 보관 정책에 따르며, 동의 철회 시 즉시 삭제 처리합니다.</p>
                  <p className="mt-3 font-semibold text-white/80">4. 제3자 제공</p>
                  <p>수집된 개인정보는 제3자에게 제공되지 않습니다.</p>
                  <p className="mt-3 font-semibold text-white/80">5. 동의 거부 권리</p>
                  <p>개인정보 수집·이용에 동의하지 않을 권리가 있으며, 동의 거부 시 검사 실시가 제한될 수 있습니다.</p>
                </div>

                {/* Checkbox */}
                <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl border border-white/[0.12] bg-white/[0.05] px-4 py-3.5 transition-colors hover:bg-white/[0.10]">
                  <div className={`flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${privacyAgreed ? "border-[#5ce1e6] bg-[#5ce1e6]" : "border-white/30 bg-transparent"}`}>
                    {privacyAgreed && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#0f1b2d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="size-3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-white/70">
                    위 내용을 확인하였으며, 개인정보 수집 및 이용에 동의합니다.
                    <span className="ml-1 text-[#ff6b6b]">*</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={privacyAgreed}
                    onChange={(e) => {
                      setPrivacyAgreed(e.target.checked);
                      if (e.target.checked) setValidationError("");
                    }}
                    className="sr-only"
                  />
                </label>

                {validationError && (
                  <p className="mt-3 text-sm text-[#ff6b6b]">{validationError}</p>
                )}

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setValidationError(""); setPhase("intro"); }}
                    className="flex-1 h-12 rounded-xl border border-white/[0.18] bg-white/[0.06] text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.12]"
                  >
                    이전
                  </button>
                  <button
                    type="button"
                    onClick={handleConsentNext}
                    className="flex-[2] h-12 rounded-xl bg-gradient-to-r from-[#175e63] to-[#1e8a8a] text-sm font-semibold text-white shadow-lg shadow-[#175e63]/30 transition-all hover:shadow-xl hover:shadow-[#5ce1e6]/20"
                  >
                    동의하고 계속하기
                  </button>
                </div>
              </GlassCard>
            </div>
          )}

          {/* ── Phase: Form ── */}
          {phase === "form" && (
            <div className="space-y-6">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-xs text-white/40">
                <button onClick={() => setPhase("intro")} className="hover:text-[#5ce1e6] transition-colors">검사 안내</button>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3"><polyline points="9 18 15 12 9 6" /></svg>
                <button onClick={() => setPhase("consent")} className="hover:text-[#5ce1e6] transition-colors">개인정보 동의</button>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3"><polyline points="9 18 15 12 9 6" /></svg>
                <span className="font-medium text-white/80">인적사항 입력</span>
              </div>

              {/* Progress indicator */}
              <div className="flex items-center gap-2">
                {["검사 안내", "개인정보 동의", "인적사항 입력"].map((label, i) => (
                  <React.Fragment key={label}>
                    <div className="flex items-center gap-1.5">
                      <div className={`flex size-6 items-center justify-center rounded-full text-[10px] font-bold ${
                        i < 2
                          ? "bg-[#5ce1e6] text-[#0f1b2d]"
                          : "bg-[#5ce1e6]/[0.15] text-[#5ce1e6] ring-2 ring-[#5ce1e6]/20"
                      }`}>
                        {i < 2 ? (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="size-3"><polyline points="20 6 9 17 4 12" /></svg>
                        ) : (
                          String(i + 1)
                        )}
                      </div>
                      <span className={`text-xs ${i === 2 ? "font-semibold text-[#5ce1e6]" : "text-white/40"}`}>{label}</span>
                    </div>
                    {i < 2 && <div className="h-px w-6 bg-[#5ce1e6]/30" />}
                  </React.Fragment>
                ))}
              </div>

              <GlassCard>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-[#5ce1e6]/[0.15] text-[#5ce1e6]">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-5">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">인적사항 입력</h2>
                    <p className="text-xs text-white/40">검사 결과 연결을 위해 필수 정보를 입력해주세요.</p>
                  </div>
                </div>

                <form
                  onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
                  noValidate
                  className="mt-6 space-y-5"
                >
                  {/* 이름 */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="pf_name" className="text-sm font-medium text-white/70">
                      이름 <span className="text-[#ff6b6b]">*</span>
                    </label>
                    <input
                      id="pf_name"
                      type="text"
                      maxLength={60}
                      placeholder="이름을 입력하세요"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputCls}
                    />
                  </div>

                  {/* 성별 */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-white/70">
                      성별 <span className="text-[#ff6b6b]">*</span>
                    </span>
                    <div className="flex gap-3">
                      {[
                        { value: "male", label: "남" },
                        { value: "female", label: "여" },
                      ].map(({ value, label }) => (
                        <label
                          key={value}
                          className={`flex flex-1 h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                            gender === value
                              ? "border-[#5ce1e6] bg-[#5ce1e6]/[0.12] text-[#5ce1e6]"
                              : "border-white/[0.15] bg-white/[0.05] text-white/40 hover:border-[#5ce1e6]/30 hover:text-white/60"
                          }`}
                        >
                          <input
                            type="radio"
                            name="pf_gender"
                            value={value}
                            checked={gender === value}
                            onChange={() => setGender(value)}
                            className="sr-only"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 생년월일 */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="pf_birth" className="text-sm font-medium text-white/70">
                      생년월일 <span className="text-[#ff6b6b]">*</span>
                    </label>
                    <input
                      id="pf_birth"
                      type="date"
                      value={birthDay}
                      onChange={(e) => setBirthDay(e.target.value)}
                      className={inputCls}
                      style={{ colorScheme: "dark" }}
                    />
                  </div>

                  {/* 학령 */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="pf_school" className="text-sm font-medium text-white/70">
                      학령 <span className="text-[#ff6b6b]">*</span>
                    </label>
                    <select
                      id="pf_school"
                      value={schoolAge}
                      onChange={(e) => setSchoolAge(e.target.value)}
                      className={inputCls}
                      style={{ colorScheme: "dark" }}
                    >
                      <option value="" disabled>학령을 선택하세요</option>
                      {SCHOOL_AGE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  {validationError && (
                    <div className="flex items-center gap-2 rounded-xl border border-[#ff6b6b]/30 bg-[#ff6b6b]/[0.08] px-4 py-3">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0 text-[#ff6b6b]">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <p className="text-sm text-[#ff6b6b]">{validationError}</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => { setValidationError(""); setPhase("consent"); }}
                      className="flex-1 h-12 rounded-xl border border-white/[0.18] bg-white/[0.06] text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.12]"
                    >
                      이전
                    </button>
                    <button
                      type="submit"
                      className="flex-[2] h-12 rounded-xl bg-gradient-to-r from-[#175e63] to-[#1e8a8a] text-sm font-semibold text-white shadow-lg shadow-[#175e63]/30 transition-all hover:shadow-xl hover:shadow-[#5ce1e6]/20 active:scale-[0.99]"
                    >
                      검사 시작하기
                    </button>
                  </div>
                </form>
              </GlassCard>

              {/* Past results */}
              <GlassCard>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">과거 실시 내역</p>
                    <p className="mt-0.5 text-xs text-white/40">과거 실시한 기존 결과입니다.</p>
                  </div>
                  <span className="rounded-full bg-white/[0.08] px-3 py-1 text-[11px] font-semibold text-white/40">전체</span>
                </div>
                <div className="mt-4 rounded-xl border border-dashed border-white/[0.15] bg-white/[0.03] py-8 text-center text-sm text-white/30">
                  인적사항을 입력하면 과거 실시 내역을 확인할 수 있습니다.
                </div>
              </GlassCard>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer
          className="relative z-10 border-t border-white/[0.10] py-4 text-center text-[11px] text-white/25"
          style={{
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          &copy; 2026 Inpsyt. All rights reserved.
        </footer>
      </div>

      {/* Privacy modal */}
      {privacyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setPrivacyModalOpen(false)}>
          <div
            className="w-full max-w-lg rounded-2xl border border-white/[0.18]"
            style={{
              background: "rgba(15,27,45,0.90)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "0 8px 32px 0 rgba(31,38,135,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/[0.10] px-6 py-4">
              <h3 className="text-base font-semibold text-white">개인정보 수집 및 이용 동의</h3>
              <button onClick={() => setPrivacyModalOpen(false)} className="text-white/40 hover:text-white text-xl leading-none">&times;</button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-6 py-5 text-sm leading-7 text-white/60">
              <p className="font-semibold text-white/80">1. 수집 항목</p>
              <p>이름, 성별, 생년월일, 학령 및 검사 응답 결과</p>
              <p className="mt-3 font-semibold text-white/80">2. 수집 목적</p>
              <p>심리검사 결과 산출, 내담자 관리, 결과 조회 및 관리자 확인</p>
            </div>
            <div className="flex justify-end gap-3 border-t border-white/[0.10] px-6 py-4">
              <button onClick={() => setPrivacyModalOpen(false)} className="rounded-lg border border-white/[0.18] px-4 py-2 text-sm text-white/60 hover:bg-white/[0.08]">닫기</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}