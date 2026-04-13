import type { QuestionItem, ResponseOption, AnswerState } from "../types"

interface Props {
  groupItems: QuestionItem[]
  options: ResponseOption[]
  answerState: AnswerState
  onAnswer: (itemId: string, value: string) => void
  startGlobalIndex: number
}

export function MatrixCard({ groupItems, options, answerState, onAnswer, startGlobalIndex }: Props) {
  const first = groupItems[0]
  const groupPrompt = first?.matrix_group_prompt || first?.text || ""
  const groupOptions = first?.response_options?.length ? first.response_options : options

  return (
    <article
      id={`question-card-${first?.id}`}
      data-item-id={first?.id}
      tabIndex={-1}
      className="overflow-hidden rounded-lg border bg-background"
    >
      <div className="border-b bg-muted/30 px-4 py-3">
        <div className="flex items-start gap-2">
          <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            Q{startGlobalIndex}–{startGlobalIndex + groupItems.length - 1}
          </span>
          <p className="text-[15px] font-semibold leading-relaxed">{groupPrompt}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/20">
              <th className="w-1/2 px-4 py-2 text-left font-normal text-muted-foreground">문항</th>
              {groupOptions.map((opt, i) => (
                <th key={i} className="min-w-[3.5rem] px-2 py-2 text-center font-normal text-muted-foreground">
                  <div className="text-[10px] text-muted-foreground">{opt.label}</div>
                  <div className="font-semibold">{opt.value}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupItems.map((item, rowIdx) => {
              const answered = Boolean(answerState[item.id])
              return (
                <tr
                  key={item.id}
                  id={`question-card-${item.id}`}
                  data-item-id={item.id}
                  className={`border-b transition-colors last:border-0 ${answered ? "bg-primary/5" : "hover:bg-muted/20"}`}
                >
                  <td className="px-4 py-2.5 text-sm">
                    <span className="text-[10px] text-muted-foreground mr-1">
                      {startGlobalIndex + rowIdx}.
                    </span>
                    {item.text}
                  </td>
                  {groupOptions.map((opt, i) => {
                    const checked = answerState[item.id] === opt.value
                    return (
                      <td key={i} className="px-2 py-2.5 text-center">
                        <label className={`inline-flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-lg border transition-colors ${checked ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/50 hover:bg-accent"}`}>
                          <input
                            type="radio"
                            name={`q_${item.id}`}
                            value={opt.value}
                            checked={checked}
                            onChange={() => onAnswer(item.id, opt.value)}
                            className="sr-only"
                          />
                          <span className={`flex size-7 items-center justify-center rounded-md text-xs font-extrabold ${checked ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                            {opt.value}
                          </span>
                        </label>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </article>
  )
}
