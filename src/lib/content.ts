export interface Stance {
  id: string
  name: string
  en: string
  summary: string
  lens: string
}

// 内容占位：名称、说明与追问均由用户决定。
export const STANCES: Stance[] = [
  {
    id: 'stance-a',
    name: '立场 A',
    en: 'STANCE A',
    summary: '（待填写）',
    lens: '（待填写）',
  },
  {
    id: 'stance-b',
    name: '立场 B',
    en: 'STANCE B',
    summary: '（待填写）',
    lens: '（待填写）',
  },
  {
    id: 'stance-c',
    name: '立场 C',
    en: 'STANCE C',
    summary: '（待填写）',
    lens: '（待填写）',
  },
]

export const STANCE_BY_ID: Record<string, Stance> = Object.fromEntries(
  STANCES.map((stance) => [stance.id, stance]),
)

export const PROBE_STATUS_LABEL = {
  open: '待回应',
  retained: '已保留',
  answered: '已回应',
  revised: '已修订',
} as const

// 探针文案占位：结构已接通，正文留给用户填写。
export const PROBE_PLACEHOLDER = {
  targetPremise: '（待填写：目标前提）',
  objection: '（待填写：异议）',
  question: '（待填写：追问）',
} as const
