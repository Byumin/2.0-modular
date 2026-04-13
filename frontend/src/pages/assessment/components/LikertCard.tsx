import type { QuestionItem, ResponseOption, AnswerState } from "../types"

interface Props {
  item: QuestionItem
  options: ResponseOption[]
  answerState: AnswerState
  onAnswer: (itemId: string, value: string) => void
  globalIndex: number
}

export function LikertCard({ item, options, answerState, onAnswer, globalIndex }: Props) {
  const itemOptions = item.response_options?.length ? item.response_options : options
  const answered = Boolean(answerState[item.id])

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
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(5.5rem,1fr))]">
        {itemOptions.map((opt, i) => {
          const checked = answerState[item.id] === opt.value
          return (
            <label
              key={i}
              data-item-id={item.id}
              data-option-index={i}
              tabIndex={0}
              role="radio"
              aria-checked={checked}
              className={`assessment-option-card min-h-[4.75rem] cursor-pointer rounded-lg border px-3 py-2.5 text-center transition-colors
                ${checked
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-foreground hover:border-primary/50 hover:bg-accent"
                }`}
            >
              <input
                type="radio"
                name={`q_${item.id}`}
                value={opt.value}
                checked={checked}
                onChange={() => onAnswer(item.id, opt.value)}
                className="sr-only"
              />
              <span className={`mx-auto flex size-8 items-center justify-center rounded-md text-sm font-extrabold ${checked ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                {opt.value}
              </span>
              {opt.label && (
                <span className="mt-1 block text-xs font-semibold leading-tight text-muted-foreground">{opt.label}</span>
              )}
            </label>
          )
        })}
      </div>
    </article>
  )
}
