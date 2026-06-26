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
  session_id?: string
  session_index?: number
  session_title?: string
  session_description?: string
  session_guide_items?: string[]
  response_options: ResponseOption[]
  items: QuestionItem[]
  item_count: number
}

export interface AssessmentSession {
  session_id: string
  session_index: number
  title: string
  description?: string
  guide_items?: string[]
  test_ids: string[]
}

export interface AdditionalProfileField {
  label: string
  type: 'short_text' | 'long_text' | 'select' | 'multi_select' | 'number' | 'date' | 'phone' | 'phon' | 'phon_num_input' | 'email'
  required: boolean
  placeholder?: string
  options: string[]
}

export interface ProfileFieldOption {
  value: string
  label: string
}

export interface TestProfileFieldConfig {
  label?: string
  required?: boolean
  type?: 'text' | 'radio' | 'select' | 'long_text' | 'number' | 'date' | 'phone' | 'phon' | 'phon_num_input' | 'email'
  options?: Array<string | ProfileFieldOption>
}

export interface TestProfileSection {
  subject_type: 'child' | 'self' | 'parent'
  section_hint?: string
  fields?: Record<string, TestProfileFieldConfig>
}

export interface TestProfileConfig {
  subject_type?: 'child' | 'self' | 'parent' | 'mixed'
  section_hint?: string
  fields?: Record<string, TestProfileFieldConfig>
  sections?: TestProfileSection[]
  optional_fields?: Record<string, TestProfileFieldConfig>
}

export interface TestTypeSelectionConfig {
  enabled?: boolean
  field_key?: string
  heading?: string
  description?: string
  default_value?: string
  options: string[]
}

export interface InitialPayload {
  custom_test_name: string
  display_name?: string
  description?: string
  estimated_time_minutes?: number
  client_intake_mode: string
  show_research_notice?: boolean
  allow_unanswered_submission?: boolean
  show_report_result?: boolean
  required_profile_fields: string[]
  profile_field_options?: Record<string, Array<string | ProfileFieldOption>>
  additional_profile_fields: Array<AdditionalProfileField | string>
  sub_test_json?: string
  access_token: string
  profile_config?: TestProfileConfig
  test_type_selection?: TestTypeSelectionConfig | null
}

export interface AssessmentPayload {
  parts?: AssessmentPart[]
  sessions?: AssessmentSession[]
  items?: QuestionItem[]
  response_options?: ResponseOption[]
}

export interface Profile {
  name: string
  exam_date?: string
  gender?: string
  birth_day?: string
  school_age?: string
  informant?: string
  [key: string]: string | string[] | undefined
}

export type AnswerState = Record<string, string>

export type AssessmentStep = 'consent' | 'test_type' | 'profile' | 'intro' | 'question' | 'complete'

export interface AssessmentDraft {
  client_id: number
  profile: Profile
  answers: AnswerState
  current_part_index: number
  current_page: number
  is_ambiguous_match: boolean
  responder_choice: 'existing' | 'new' | null
  candidate_client_ids: number[]
  updated_at?: string | null
}

export const QUESTION_PAGE_SIZE = 5
export const AUTO_CREATE_CONFIRM_REQUIRED_CODE = 'AUTO_CREATE_CONFIRM_REQUIRED'
export const AMBIGUOUS_CLIENT_CODE = 'AMBIGUOUS_CLIENT'
export const ALREADY_SUBMITTED_CONFIRM_REQUIRED_CODE = 'ALREADY_SUBMITTED_CONFIRM_REQUIRED'

export interface AmbiguousCandidate {
  id: number
  name: string
  gender: string
  birth_day: string | null
}
