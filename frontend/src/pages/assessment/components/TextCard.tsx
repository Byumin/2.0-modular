import type { QuestionItem, AnswerState } from "../types"

interface Props {
  item: QuestionItem
  answerState: AnswerState
  onAnswer: (itemId: string, value: string) => void
  globalIndex: number
  hideHeader?: boolean
}

export function TextCard({ item, answerState, onAnswer, globalIndex, hideHeader }: Props) {
  const value = answerState[item.id] ?? ""

  // 카드형: 외부 wrapper가 카드 스타일을 제공하므로 content만 렌더링
  if (hideHeader) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[15px] leading-relaxed text-foreground">{item.text}</p>
        <textarea
          name={`q_${item.id}`}
          className="assessment-text-answer w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          rows={3}
          value={value}
          onChange={(e) => onAnswer(item.id, e.target.value)}
          placeholder="응답을 입력하세요"
        />
      </div>
    )
  }

  return (
    <article
      id={`question-card-${item.id}`}
      data-item-id={item.id}
      tabIndex={-1}
      className={`flex flex-col gap-4 rounded-lg border bg-background p-4 transition-colors sm:p-5 ${value ? "border-primary/40" : "border-border"}`}
    >
      <div className="flex items-start gap-2">
        <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          Q{globalIndex}
        </span>
        <p className="text-[15px] leading-relaxed text-foreground">{item.text}</p>
      </div>
      <textarea
        name={`q_${item.id}`}
        className="assessment-text-answer w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        rows={3}
        value={value}
        onChange={(e) => onAnswer(item.id, e.target.value)}
        placeholder="응답을 입력하세요"
      />
    </article>
  )
}
