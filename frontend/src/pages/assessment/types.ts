export interface ResponseOption {
  value: string
  label: string
}

export interface QuestionItem {
  id: string
  text: string
  render_type?: string
  response_style?: string
  response_options?: ResponseOption[]
  matrix_group_key?: string
  matrix_group_prompt?: string
  render_config?: { hide_empty_labels?: boolean }
  order_index?: number
  global_order_index?: number
}

export interface AssessmentPart {
  part_id: string
  part_index: number
  title: string
  response_options: ResponseOption[]
  items: QuestionItem[]
  item_count: number
}

export interface AdditionalProfileField {
  label: string
  type: 'short_text' | 'long_text' | 'select' | 'multi_select' | 'number' | 'date' | 'phone' | 'email'
  required: boolean
  placeholder?: string
  options: string[]
}

export interface InitialPayload {
  custom_test_name: string
  client_intake_mode: string
  required_profile_fields: string[]
  additional_profile_fields: Array<AdditionalProfileField | string>
  sub_test_json?: string
  access_token: string
}

export interface AssessmentPayload {
  parts?: AssessmentPart[]
  items?: QuestionItem[]
  response_options?: ResponseOption[]
}

export interface Profile {
  name: string
  gender?: string
  birth_day?: string
  school_age?: string
  [key: string]: string | string[] | undefined
}

export type AnswerState = Record<string, string>

export type AssessmentStep = 'profile' | 'question' | 'complete'

export const QUESTION_PAGE_SIZE = 5
export const AUTO_CREATE_CONFIRM_REQUIRED_CODE = 'AUTO_CREATE_CONFIRM_REQUIRED'
export const AMBIGUOUS_CLIENT_CODE = 'AMBIGUOUS_CLIENT'

export interface AmbiguousCandidate {
  id: number
  name: string
  gender: string
  birth_day: string | null
}
