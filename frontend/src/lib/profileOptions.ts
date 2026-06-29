export const INFORMANT_OPTIONS = [
  { value: "mother", label: "어머니" },
  { value: "father", label: "아버지" },
  { value: "etc", label: "기타" },
] as const

export const INFORMANT_ORDER = INFORMANT_OPTIONS.map((option) => option.value)

export const INFORMANT_LABELS: Record<string, string> = Object.fromEntries(
  INFORMANT_OPTIONS.map((option) => [option.value, option.label]),
)

export function informantOrderIndex(value: string): number {
  const index = INFORMANT_ORDER.indexOf(value as (typeof INFORMANT_ORDER)[number])
  return index >= 0 ? index : INFORMANT_ORDER.length
}
