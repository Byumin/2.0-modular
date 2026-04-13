import type { QuestionItem, ResponseOption, AnswerState } from "../types"
import { LikertCard } from "./LikertCard"
import { BipolarCard } from "./BipolarCard"
import { TextCard } from "./TextCard"

interface Props {
  item: QuestionItem
  options: ResponseOption[]
  answerState: AnswerState
  onAnswer: (itemId: string, value: string) => void
  globalIndex: number
}

function resolveRenderType(item: QuestionItem): string {
  const rt = item.render_type?.trim() || ""
  if (rt) return rt
  const rs = item.response_style?.trim() || ""
  if (rs === "bipolar") return "bipolar"
  return "likert"
}

export function QuestionCard({ item, options, answerState, onAnswer, globalIndex }: Props) {
  const renderType = resolveRenderType(item)

  if (renderType === "text") {
    return (
      <TextCard
        item={item}
        answerState={answerState}
        onAnswer={onAnswer}
        globalIndex={globalIndex}
      />
    )
  }

  if (
    renderType === "bipolar" ||
    renderType === "bipolar_with_prompt" ||
    renderType === "bipolar_labels_only"
  ) {
    return (
      <BipolarCard
        item={item}
        options={options}
        answerState={answerState}
        onAnswer={onAnswer}
        globalIndex={globalIndex}
        renderType={renderType}
      />
    )
  }

  // likert (default)
  return (
    <LikertCard
      item={item}
      options={options}
      answerState={answerState}
      onAnswer={onAnswer}
      globalIndex={globalIndex}
    />
  )
}
