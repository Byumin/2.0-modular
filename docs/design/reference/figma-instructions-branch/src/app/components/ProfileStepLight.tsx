/**
 * 시안 A: 라이트 배경 + 은은한 블롭 + 프로스트 글래스
 * 검사 실시 화면(#f0f2f5)과 동일 배경으로 자연스럽게 이어짐
 */
import * as React from "react";

const SCHOOL_AGE_OPTIONS = [
  "미취학", "초등 1학년", "초등 2학년", "초등 3학년",
  "초등 4학년", "초등 5학년", "초등 6학년", "초등학교 졸업생",
  "중등 1학년", "중등 2학년", "중등 3학년", "중학교 졸업생",
  "고등 1학년", "고등 2학년", "고등 3학년", "고등학교 졸업생",
  "대학생 재학생", "대학원 재학생",
];

/* ── Blob keyframes ── */
const blobStyleId = "profile-light-blob-styles";
if (typeof document !== "undefined" && !document.getElementById(blobStyleId)) {
  const style = document.createElement("style");
  style.id = blobStyleId;
  style.textContent = `
    @keyframes blobLight1 {
      0%   { transform: translate(-80px, -40px) rotate(-90deg); border-radius: 24% 76% 35% 65% / 27% 36% 64% 73%; }
      33%  { transform: translate(200px, 60px) rotate(-30deg); border-radius: 50% 50% 40% 60% / 60% 40% 60% 40%; }
      66%  { transform: translate(350px, -30px) rotate(20deg); border-radius: 60% 40% 55% 45% / 35% 65% 35% 65%; }
      100% { transform: translate(-80px, -40px) rotate(-90deg); border-radius: 24% 76% 35% 65% / 27% 36% 64% 73%; }
    }
    @keyframes blobLight2 {
      0%   { transform: translate(80px, 40px) rotate(30deg); border-radius: 60% 40% 55% 45% / 50% 60% 40% 50%; }
      33%  { transform: translate(-200px, -80px) rotate(-40deg); border-radius: 35% 65% 70% 30% / 45% 30% 70% 55%; }
      66%  { transform: translate(-100px, 100px) rotate(60deg); border-radius: 45% 55% 40% 60% / 55% 45% 55% 45%; }
      100% { transform: translate(80px, 40px) rotate(30deg); border-radius: 60% 40% 55% 45% / 50% 60% 40% 50%; }
    }
    @keyframes blobLight3 {
      0%   { transform: translate(0px, 80px) rotate(0deg); border-radius: 40% 60% 50% 50% / 55% 45% 55% 45%; }
      33%  { transform: translate(180px, -100px) rotate(45deg); border-radius: 55% 45% 35% 65% / 40% 65% 35% 60%; }
      66%  { transform: translate(-150px, -50px) rotate(-30deg); border-radius: 70% 30% 50% 50% / 30% 70% 30% 70%; }
      100% { transform: translate(0px, 80px) rotate(0deg); border-radius: 40% 60% 50% 50% / 55% 45% 55% 45%; }
    }
  `;
  document.head.appendChild(style);
}

interface ProfileStepProps { onNext: () => void; }

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-[#e8ebee] p-6 sm:p-8 ${className}`}
      style={{
        background: "rgba(255, 255, 255, 0.75)",
        boxShadow: "0 8px 32px 0 rgba(23, 94, 99, 0.08)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
      }}
    >
      {children}
    </div>
  );
}

export function ProfileStepLight({ onNext }: ProfileStepProps) {
  const testName = "하네스 엔지니어링 심리검사";
  const [phase, setPhase] = React.useState<"intro" | "consent" | "form">("intro");
  const [privacyAgreed, setPrivacyAgreed] = React.useState(false);
  const [name, setName] = React.useState("");
  const [gender, setGender] = React.useState("");
  const [birthDay, setBirthDay] = React.useState("");
  const [schoolAge, setSchoolAge] = React.useState("");
  const [validationError, setValidationError] = React.useState("");

  function handleConsentNext() {
    if (!privacyAgreed) { setValidationError("개인정보 수집 및 이용에 동의해주세요."); return; }
    setValidationError(""); setPhase("form");
  }
  function handleSubmit() {
    setValidationError("");
    if (!name.trim()) { setValidationError("이름을 입력해주세요."); return; }
    if (!gender) { setValidationError("성별을 선택해주세요."); return; }
    if (!birthDay) { setValidationError("생년월일을 입력해주세요."); return; }
    if (!schoolAge) { setValidationError("학령을 선택해주세요."); return; }
    onNext();
  }

  const inputCls =
    "h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-4 text-sm text-[#161d1b] placeholder:text-[#b0bab7] transition-colors focus:border-[#175e63] focus:outline-none focus:ring-2 focus:ring-[#175e63]/20";

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: "#f0f2f5", fontFamily: "'Nunito', sans-serif" }}
    >
      {/* ── Animated blobs (subtle on light bg) ── */}
      <div className="pointer-events-none absolute" style={{ width: 500, height: 500, left: "5%", top: "0%", background: "radial-gradient(circle, rgba(23,94,99,0.40) 0%, rgba(56,189,248,0.20) 50%, transparent 80%)", animation: "blobLight1 22s infinite alternate cubic-bezier(0.07,0.8,0.16,1)", filter: "blur(60px)" }} />
      <div className="pointer-events-none absolute" style={{ width: 400, height: 400, right: "0%", bottom: "5%", background: "radial-gradient(circle, rgba(245,158,11,0.35) 0%, rgba(251,191,36,0.15) 50%, transparent 80%)", animation: "blobLight2 28s infinite alternate cubic-bezier(0.07,0.8,0.16,1)", filter: "blur(50px)" }} />
      <div className="pointer-events-none absolute" style={{ width: 350, height: 350, left: "40%", top: "50%", background: "radial-gradient(circle, rgba(244,163,149,0.38) 0%, rgba(251,146,60,0.15) 50%, transparent 80%)", animation: "blobLight3 30s infinite alternate cubic-bezier(0.07,0.8,0.16,1)", filter: "blur(70px)" }} />

      {/* Top accent line */}
      <div className="relative z-10 h-1 bg-gradient-to-r from-[#175e63] via-[#2ba3a8] to-[#175e63]" />

      {/* Header */}
      <header className="relative z-10 border-b border-[#e8ebee] bg-white/80" style={{ backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)" }}>
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-6 py-4">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#175e63] text-sm font-bold text-white shadow-lg shadow-[#175e63]/20">H</div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#175e63]">Inpsyt Assessment</p>
            <p className="text-sm font-semibold text-[#161d1b]">{testName}</p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 mx-auto max-w-2xl px-6 py-10">

        {/* ── Intro ── */}
        {phase === "intro" && (
          <div className="space-y-8">
            <GlassCard className="relative overflow-hidden rounded-3xl">
              <div className="relative">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#175e63]">
                  <div className="h-px w-6 bg-[#175e63]/30" />검사 안내
                </div>
                <h1 className="mt-5 text-[22px] font-bold leading-snug text-[#161d1b] sm:text-[26px]">
                  검사 안내
                </h1>
                <p className="mt-4 max-w-md text-sm leading-7 text-[#5f6f73]">
                  본 검사는 심리적 특성과 행동 패턴을 파악하기 위한 표준화된 도구입니다. 솔직하게 응답해주시면 더 정확한 결과를 얻을 수 있습니다.
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#5f6f73]">
                  <span className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#175e63" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                    약 10~15분
                  </span>
                  <span className="h-3 w-px bg-[#d0d5d8]" />
                  <span className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#175e63" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                    총 8문항 · 5점 척도
                  </span>
                  <span className="h-3 w-px bg-[#d0d5d8]" />
                  <span className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#175e63" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                    응답 정보 보호
                  </span>
                </div>
              </div>
            </GlassCard>

            {/* Guidelines */}
            <GlassCard>
              <h3 className="text-sm font-semibold text-[#161d1b]">검사 안내사항</h3>
              <ul className="mt-4 space-y-3">
                {[
                  "정답이나 오답이 없습니다. 평소 자신의 모습에 가장 가까운 응답을 선택하세요.",
                  "너무 오래 고민하지 마시고, 첫 번째 느낌으로 응답해주세요.",
                  "검사 도중 중단하더라도 응답은 자동 저장됩니다.",
                  "모든 문항에 응답해야 결과를 확인할 수 있습니다.",
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#175e63]/[0.10] text-[10px] font-bold text-[#175e63]">{i + 1}</span>
                    <span className="text-sm leading-6 text-[#5f6f73]">{text}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>

            <button type="button" onClick={() => setPhase("consent")} className="group flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#175e63] to-[#1e8a8a] text-base font-semibold text-white shadow-lg shadow-[#175e63]/20 transition-all hover:shadow-xl hover:shadow-[#175e63]/30 active:scale-[0.99]">
              검사 시작하기
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 transition-transform group-hover:translate-x-0.5"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
        )}

        {/* ── Consent ── */}
        {phase === "consent" && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-xs text-[#8a9a96]">
              <button onClick={() => setPhase("intro")} className="hover:text-[#175e63] transition-colors">검사 안내</button>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3"><polyline points="9 18 15 12 9 6" /></svg>
              <span className="font-medium text-[#161d1b]">개인정보 동의</span>
            </div>
            <GlassCard>
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-[#175e63]/[0.10] text-[#175e63]">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#161d1b]">개인정보 수집 및 이용 동의</h2>
                  <p className="text-xs text-[#8a9a96]">검사 진행을 위해 아래 내용을 확인해주세요.</p>
                </div>
              </div>
              <div className="mt-6 max-h-[240px] overflow-y-auto rounded-xl border border-[#e8ebee] bg-[#f8f9fa] p-5 text-sm leading-7 text-[#5f6f73]">
                <p className="font-semibold text-[#161d1b]">1. 수집 항목</p>
                <p>이름, 성별, 생년월일, 학령 및 검사 응답 결과</p>
                <p className="mt-3 font-semibold text-[#161d1b]">2. 수집 목적</p>
                <p>심리검사 결과 산출, 내담자 관리, 결과 조회 및 관리자 확인</p>
                <p className="mt-3 font-semibold text-[#161d1b]">3. 보유 기간</p>
                <p>기관 내 보관 정책에 따르며, 동의 철회 시 즉시 삭제 처리합니다.</p>
                <p className="mt-3 font-semibold text-[#161d1b]">4. 제3자 제공</p>
                <p>수집된 개인정보는 제3자에게 제공되지 않습니다.</p>
                <p className="mt-3 font-semibold text-[#161d1b]">5. 동의 거부 권리</p>
                <p>개인정보 수집·이용에 동의하지 않을 권리가 있으며, 동의 거부 시 검사 실시가 제한될 수 있습니다.</p>
              </div>
              <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl border border-[#e8ebee] bg-[#f8f9fa] px-4 py-3.5 transition-colors hover:bg-[#eef0f2]">
                <div className={`flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${privacyAgreed ? "border-[#175e63] bg-[#175e63]" : "border-[#b0bab7] bg-transparent"}`}>
                  {privacyAgreed && (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="size-3"><polyline points="20 6 9 17 4 12" /></svg>)}
                </div>
                <span className="text-sm text-[#5f6f73]">위 내용을 확인하였으며, 개인정보 수집 및 이용에 동의합니다.<span className="ml-1 text-[#ff6b6b]">*</span></span>
                <input type="checkbox" checked={privacyAgreed} onChange={(e) => { setPrivacyAgreed(e.target.checked); if (e.target.checked) setValidationError(""); }} className="sr-only" />
              </label>
              {validationError && <p className="mt-3 text-sm text-[#ff6b6b]">{validationError}</p>}
              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => { setValidationError(""); setPhase("intro"); }} className="flex-1 h-12 rounded-xl border border-[#e8ebee] bg-white text-sm font-medium text-[#5f6f73] transition-colors hover:bg-[#f8f9fa]">이전</button>
                <button type="button" onClick={handleConsentNext} className="flex-[2] h-12 rounded-xl bg-gradient-to-r from-[#175e63] to-[#1e8a8a] text-sm font-semibold text-white shadow-lg shadow-[#175e63]/20 transition-all hover:shadow-xl hover:shadow-[#175e63]/30">동의하고 계속하기</button>
              </div>
            </GlassCard>
          </div>
        )}

        {/* ── Form ── */}
        {phase === "form" && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-xs text-[#8a9a96]">
              <button onClick={() => setPhase("intro")} className="hover:text-[#175e63] transition-colors">검사 안내</button>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3"><polyline points="9 18 15 12 9 6" /></svg>
              <button onClick={() => setPhase("consent")} className="hover:text-[#175e63] transition-colors">개인정보 동의</button>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3"><polyline points="9 18 15 12 9 6" /></svg>
              <span className="font-medium text-[#161d1b]">인적사항 입력</span>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-2">
              {["검사 안내", "개인정보 동의", "인적사항 입력"].map((label, i) => (
                <React.Fragment key={label}>
                  <div className="flex items-center gap-1.5">
                    <div className={`flex size-6 items-center justify-center rounded-full text-[10px] font-bold ${i < 2 ? "bg-[#175e63] text-white" : "bg-[#175e63]/[0.10] text-[#175e63] ring-2 ring-[#175e63]/15"}`}>
                      {i < 2 ? (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="size-3"><polyline points="20 6 9 17 4 12" /></svg>) : String(i + 1)}
                    </div>
                    <span className={`text-xs ${i === 2 ? "font-semibold text-[#175e63]" : "text-[#8a9a96]"}`}>{label}</span>
                  </div>
                  {i < 2 && <div className="h-px w-6 bg-[#175e63]/20" />}
                </React.Fragment>
              ))}
            </div>

            <GlassCard>
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-[#175e63]/[0.10] text-[#175e63]">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#161d1b]">인적사항 입력</h2>
                  <p className="text-xs text-[#8a9a96]">검사 결과 연결을 위해 필수 정보를 입력해주세요.</p>
                </div>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} noValidate className="mt-6 space-y-5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="pf_name_l" className="text-sm font-medium text-[#5f6f73]">이름 <span className="text-[#ff6b6b]">*</span></label>
                  <input id="pf_name_l" type="text" maxLength={60} placeholder="이름을 입력하세요" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-[#5f6f73]">성별 <span className="text-[#ff6b6b]">*</span></span>
                  <div className="flex gap-3">
                    {[{ value: "male", label: "남" }, { value: "female", label: "여" }].map(({ value, label }) => (
                      <label key={value} className={`flex flex-1 h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 text-sm font-semibold transition-all ${gender === value ? "border-[#175e63] bg-[#175e63]/[0.08] text-[#175e63]" : "border-[#e2e8f0] bg-white text-[#8a9a96] hover:border-[#175e63]/30 hover:text-[#5f6f73]"}`}>
                        <input type="radio" name="pf_gender_l" value={value} checked={gender === value} onChange={() => setGender(value)} className="sr-only" />{label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="pf_birth_l" className="text-sm font-medium text-[#5f6f73]">생년월일 <span className="text-[#ff6b6b]">*</span></label>
                  <input id="pf_birth_l" type="date" value={birthDay} onChange={(e) => setBirthDay(e.target.value)} className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="pf_school_l" className="text-sm font-medium text-[#5f6f73]">학령 <span className="text-[#ff6b6b]">*</span></label>
                  <select id="pf_school_l" value={schoolAge} onChange={(e) => setSchoolAge(e.target.value)} className={inputCls}>
                    <option value="" disabled>학령을 선택하세요</option>
                    {SCHOOL_AGE_OPTIONS.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                  </select>
                </div>
                {validationError && (
                  <div className="flex items-center gap-2 rounded-xl border border-[#ff6b6b]/30 bg-[#ff6b6b]/[0.06] px-4 py-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0 text-[#ff6b6b]"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                    <p className="text-sm text-[#ff6b6b]">{validationError}</p>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setValidationError(""); setPhase("consent"); }} className="flex-1 h-12 rounded-xl border border-[#e8ebee] bg-white text-sm font-medium text-[#5f6f73] transition-colors hover:bg-[#f8f9fa]">이전</button>
                  <button type="submit" className="flex-[2] h-12 rounded-xl bg-gradient-to-r from-[#175e63] to-[#1e8a8a] text-sm font-semibold text-white shadow-lg shadow-[#175e63]/20 transition-all hover:shadow-xl hover:shadow-[#175e63]/30 active:scale-[0.99]">검사 시작하기</button>
                </div>
              </form>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#161d1b]">과거 실시 내역</p>
                  <p className="mt-0.5 text-xs text-[#8a9a96]">과거 실시한 기존 결과입니다.</p>
                </div>
                <span className="rounded-full bg-[#f0f2f5] px-3 py-1 text-[11px] font-semibold text-[#8a9a96]">전체</span>
              </div>
              <div className="mt-4 rounded-xl border border-dashed border-[#e8ebee] bg-[#f8f9fa] py-8 text-center text-sm text-[#b0bab7]">
                인적사항을 입력하면 과거 실시 내역을 확인할 수 있습니다.
              </div>
            </GlassCard>
          </div>
        )}
      </main>

      <footer className="relative z-10 border-t border-[#e8ebee] bg-white/60 py-4 text-center text-[11px] text-[#b0bab7]" style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
        &copy; 2026 Inpsyt. All rights reserved.
      </footer>
    </div>
  );
}