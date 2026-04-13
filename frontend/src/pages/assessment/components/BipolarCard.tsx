import type { QuestionItem, ResponseOption, AnswerState } from "../types"

interface Props {
  item: QuestionItem
  options: ResponseOption[]
  answerState: AnswerState
  onAnswer: (itemId: string, value: string) => void
  globalIndex: number
  renderType: string
}

export function BipolarCard({ item, options, answerState, onAnswer, globalIndex, renderType }: Props) {
  const itemOptions = item.response_options?.length ? item.response_options : options
  const leftOpt = itemOptions[0] ?? { value: "", label: "" }
  const rightOpt = itemOptions[itemOptions.length - 1] ?? { value: "", label: "" }
  const hideEmptyLabels = item.render_config?.hide_empty_labels ?? false

  return (
    <article
      id={`question-card-${item.id}`}
      data-item-id={item.id}
      tabIndex={-1}
      className={`flex flex-col gap-4 rounded-lg border bg-background p-4 transition-colors sm:p-5 ${answerState[item.id] ? "border-primary/40" : "border-border"}`}
    >
      <div className="flex items-start gap-2">
        <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          Q{globalIndex}
        </span>
        {renderType !== "bipolar_labels_only" && (
          <p className="text-[15px] leading-relaxed text-foreground">{item.text}</p>
        )}
      </div>

      <div
        className="grid gap-3 sm:grid-cols-[minmax(7.5rem,1fr)_minmax(15rem,2fr)_minmax(7.5rem,1fr)] sm:items-center"
        role="radiogroup"
        aria-label={`문항 ${globalIndex} 응답`}
      >
        <span className="min-w-0 text-sm font-semibold leading-snug text-muted-foreground sm:text-right">
          {leftOpt.label || (!hideEmptyLabels ? leftOpt.value : "")}
        </span>

        <div
          className="grid w-full gap-2"
          style={{ gridTemplateColumns: `repeat(${Math.max(itemOptions.length, 1)}, minmax(0, 1fr))` }}
        >
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
                className={`assessment-option-card cursor-pointer rounded-lg border px-2 py-2 text-center transition-colors
                  ${checked
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background hover:border-primary/50 hover:bg-accent"
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
              </label>
            )
          })}
        </div>

        <span className="min-w-0 text-sm font-semibold leading-snug text-muted-foreground">
          {rightOpt.label || (!hideEmptyLabels ? rightOpt.value : "")}
        </span>
      </div>
    </article>
  )
}
