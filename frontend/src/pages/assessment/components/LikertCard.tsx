import type { QuestionItem, ResponseOption, AnswerState } from "../types"

interface Props {
  item: QuestionItem
  options: ResponseOption[]
  answerState: AnswerState
  onAnswer: (itemId: string, value: string) => void
  globalIndex: number
  hideHeader?: boolean
}

const OptionGrid = ({ item, itemOptions, answerState, onAnswer }: {
  item: QuestionItem
  itemOptions: ResponseOption[]
  answerState: AnswerState
  onAnswer: (itemId: string, value: string) => void
}) => (
  <div className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(5.5rem,1fr))]">
    {itemOptions.map((opt, i) => {
      const checked = answerState[item.id] === opt.value
      const isNoAnswer = opt.label === "무응답"
      return (
        <label
          key={i}
          data-item-id={item.id}
          data-option-index={i}
          tabIndex={0}
          role="radio"
          aria-checked={checked}
          className={`assessment-option-card min-h-[4.75rem] cursor-pointer rounded-lg border px-3 py-2.5 text-center transition-colors
            ${isNoAnswer
              ? checked
                ? "border-gray-400 bg-gray-100 text-gray-500"
                : "border-[#e8ebee] bg-white text-[#8a9a96] hover:border-gray-300 hover:bg-gray-50"
              : checked
                ? "border-[var(--sa-40)]"
                : "border-[#e8ebee] bg-white text-[#161d1b] hover:border-[var(--sa-30)] hover:bg-[#eef2f4]/50"
            }`}
          style={!isNoAnswer && checked ? { backgroundColor: "var(--sa-08)", color: "var(--sa)" } : undefined}
        >
          <input
            type="radio"
            name={`q_${item.id}`}
            value={opt.value}
            checked={checked}
            onChange={() => onAnswer(item.id, opt.value)}
            className="sr-only"
          />
          <span
            className={`mx-auto flex size-8 items-center justify-center rounded-md text-sm font-extrabold ${
              isNoAnswer
                ? checked ? "bg-gray-300 text-gray-600" : "bg-[#f0f2f5] text-[#8a9a96]"
                : checked ? "text-white" : "bg-[#f0f2f5] text-[#5f6f73]"
            }`}
            style={!isNoAnswer && checked ? { backgroundColor: "var(--sa)" } : undefined}
          >
            {opt.value}
          </span>
          {opt.label && (
            <span
              className={`mt-1 block text-xs font-semibold leading-tight ${checked && !isNoAnswer ? "" : "text-[#8a9a96]"}`}
              style={checked && !isNoAnswer ? { color: "var(--sa)" } : undefined}
            >{opt.label}</span>
          )}
        </label>
      )
    })}
  </div>
)

export function LikertCard({ item, options, answerState, onAnswer, globalIndex, hideHeader }: Props) {
  const itemOptions = item.response_options?.length ? item.response_options : options
  const answered = Boolean(answerState[item.id])

  // 카드형: 외부 wrapper가 카드 스타일을 제공하므로 content만 렌더링
  if (hideHeader) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[15px] leading-relaxed text-[#161d1b]">{item.text}</p>
        <OptionGrid item={item} itemOptions={itemOptions} answerState={answerState} onAnswer={onAnswer} />
      </div>
    )
  }

  return (
    <article
      id={`question-card-${item.id}`}
      data-item-id={item.id}
      tabIndex={-1}
      className={`flex flex-col gap-4 rounded-lg border bg-background p-4 transition-colors sm:p-5 ${answered ? "border-primary/40" : "border-border"}`}
    >
      <div className="flex items-start gap-2">
        <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          Q{globalIndex}
        </span>
        <p className="text-[15px] leading-relaxed text-foreground">{item.text}</p>
      </div>
      <OptionGrid item={item} itemOptions={itemOptions} answerState={answerState} onAnswer={onAnswer} />
    </article>
  )
}
