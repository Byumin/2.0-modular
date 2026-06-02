import * as React from "react"
import { IconChevronDown } from "@tabler/icons-react"

const INTRO: string[] = [
  "안녕하세요. 본 연구에 관심을 가져 주셔서 감사합니다.",
  "이 연구는 부모님이 자녀를 키우면서 경험하는 다양한 심리적 특성을 정밀하게 측정할 수 있는 검사 도구(척도)를 개발하기 위한 것입니다.",
  "이렇게 개발된 검사는 자녀를 이해하고 교육하는 과정의 상담·평가 같은 임상 현장은 물론, 부모 교육 등 다양한 장면에서 보다 객관적이고 세밀한 평가 도구로 쓰이게 됩니다.",
  "현장에서 믿고 사용할 수 있는 전문적인 심리검사를 만들기 위해, 부모님의 소중한 참여가 꼭 필요합니다.",
  "문항에는 정답이 없습니다. 자녀를 키우며 느끼시는 그대로, 솔직하고 편안하게 응답해 주시면 됩니다.",
]

const BENEFIT_LINES: string[] = [
  "설문을 완료하시면 위 검사 3종의 결과를 바로 확인하실 수 있습니다.",
  "개발 중인 검사의 결과는 연구가 모두 끝난 뒤 작성해 주신 이메일로 따로 보내 드립니다.",
]

const TESTS: { code: string; name: string; desc: string }[] = [
  {
    code: "PAT-2",
    name: "부모양육태도검사",
    desc: "지지표현, 합리적 설명, 성취압력, 비일관성 등 부모양육태도에 대한 정보를 제공하여 양육 스타일을 이해하고 바람직한 조정 방안을 안내받을 수 있습니다.",
  },
  {
    code: "K-PSI-4-SF",
    name: "한국판 부모양육스트레스검사 4판 · 단축형",
    desc: "부모의 고통, 부모-자녀의 역기능적 상호작용, 까다로운 자녀 특성에 대한 정보를 제공하여 양육스트레스 수준을 파악할 수 있습니다.",
  },
  {
    code: "PCT",
    name: "부모양육특성검사",
    desc: "전반적인 양육효능감, 배우자의 양육협력, 부모 상호작용 유형에 대한 정보를 제공하여 자녀에게 영향을 미치는 심리적 요인을 파악할 수 있습니다.",
  },
]

export function ResearchNotice() {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="mt-7 w-full max-w-[560px] rounded-[18px] border border-[#e7ede9] bg-white/80 p-7 shadow-[0_1px_2px_rgba(23,94,99,0.04),0_12px_32px_-16px_rgba(23,94,99,0.22)] backdrop-blur-sm [word-break:keep-all] lg:mx-auto lg:max-w-[600px] xl:max-w-[620px]">
      <span className="inline-flex items-center gap-2.5 whitespace-nowrap text-[12px] font-bold tracking-[0.04em] text-[#175e63]">
        <span className="h-0.5 w-[22px] rounded bg-[#5ce1e6]" />
        연구 참여 안내
      </span>

      <p className="mt-3 text-[13.5px] font-medium leading-[1.85] text-[#161d1b]">{INTRO[0]}</p>
      {INTRO.slice(1).map((paragraph) => (
        <p key={paragraph} className="mt-3 text-[13.5px] leading-[1.85] text-[#3f4f4b]">
          {paragraph}
        </p>
      ))}

      <div className="mt-5 rounded-[14px] border border-[#cfe5e2] bg-[linear-gradient(135deg,rgba(23,94,99,0.055),rgba(92,225,230,0.07))] p-5">
        <div className="flex flex-col items-start gap-2.5">
          <span className="inline-flex h-[22px] items-center whitespace-nowrap rounded-full bg-[#175e63] px-2.5 text-[11px] font-bold text-white">
            참여 혜택
          </span>
          <span className="text-[14.5px] font-bold text-[#161d1b]">
            유료 부모 검사 <b className="text-[#175e63]">3종 무료 제공</b>
          </span>
        </div>
        <ul className="mt-3 grid gap-2">
          {BENEFIT_LINES.map((line) => (
            <li key={line} className="flex gap-2.5 text-[13px] leading-[1.7] text-[#3f4f4b]">
              <span className="mt-[7px] h-[7px] w-[7px] shrink-0 rounded-full bg-[#5ce1e6] shadow-[0_0_0_3px_rgba(92,225,230,0.22)]" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors ${
            open ? "border-[#cfe0dc] bg-[#f9fbfb]" : "border-[#dfe5e3] bg-white hover:border-[#cfe0dc]"
          }`}
        >
          <span className="flex items-center gap-2.5">
            <span className="whitespace-nowrap text-[13.5px] font-bold text-[#161d1b]">제공되는 검사</span>
            <span className="inline-flex h-5 items-center whitespace-nowrap rounded-full bg-[#e8f3f1] px-2 text-[11px] font-bold text-[#175e63]">
              3종
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="whitespace-nowrap text-[12px] font-semibold text-[#175e63]">
              {open ? "접기" : "자세히 보기"}
            </span>
            <IconChevronDown
              size={16}
              className={`text-[#175e63] transition-transform duration-300 ${open ? "rotate-180" : ""}`}
            />
          </span>
        </button>

        <div className={`overflow-hidden transition-[max-height] duration-300 ease-out ${open ? "max-h-[640px]" : "max-h-0"}`}>
          <div className="grid gap-2.5 pt-2.5">
            {TESTS.map((test) => (
              <div key={test.code} className="rounded-xl border border-[#e8eded] bg-white p-4 transition-colors hover:border-[#cfe0dc]">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex h-[22px] items-center whitespace-nowrap rounded-md bg-[#e8f3f1] px-2.5 text-[12px] font-bold text-[#175e63]">
                    {test.code}
                  </span>
                  <span className="text-[13.5px] font-semibold text-[#161d1b]">{test.name}</span>
                </div>
                <p className="mt-2 text-[12.5px] leading-[1.7] text-[#5f6f73]">{test.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
