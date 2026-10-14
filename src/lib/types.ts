export interface Option {
  key: string
  text: string
}

export interface Vote {
  /** One or more option letters, e.g. "A" or "AC" */
  choice: string
  pct: number
}

export interface Question {
  id: number
  question: string
  options: Option[]
  /** Official answer letters, sorted, e.g. "C" or "BE" */
  answer: string
  multi: boolean
  /** Community vote distribution from the source, when it had one */
  votes: Vote[]
  /** Percentage shown without a label in the source (small slices) */
  votesOther: number
  /** How many discussion comments selected each answer */
  selectedCounts: Record<string, number>
  /** Most-voted community answer (from votes, else from comments) */
  community: string | null
  commentCount: number
}

export interface Comment {
  user: string
  badge: string | null
  time: string
  selected: string | null
  body: string
  upvotes: number
  replies: Comment[]
}

export type GradeBy = 'official' | 'community'
export type Theme = 'system' | 'light' | 'dark'

export interface AnswerRecord {
  picked: string[]
  correct: boolean
  /** Unix ms */
  at: number
  /** Which answer it was graded against */
  gradedBy: GradeBy
}

export interface Settings {
  gradeBy: GradeBy
  theme: Theme
}

export interface ExamResult {
  id: string
  startedAt: number
  finishedAt: number
  ids: number[]
  answers: Record<string, string[]>
  correct: number
}

export interface ProgressState {
  answers: Record<string, AnswerRecord>
  bookmarks: number[]
  settings: Settings
  lastId: number
  exams: ExamResult[]
}

export interface ExamSession {
  id: string
  ids: number[]
  startedAt: number
  /** Minutes; 0 means untimed */
  minutes: number
  answers: Record<string, string[]>
  flagged: number[]
  index: number
}
