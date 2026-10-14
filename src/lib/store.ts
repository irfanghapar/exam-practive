import { useSyncExternalStore } from 'react'
import type { AnswerRecord, ExamResult, ExamSession, ProgressState, Settings } from './types'

const KEY = 'exam-practive:v1'
const EXAM_KEY = 'exam-practive:exam'

const defaults: ProgressState = {
  answers: {},
  bookmarks: [],
  settings: { gradeBy: 'official', theme: 'system' },
  lastId: 1,
  exams: [],
}

function load(): ProgressState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<ProgressState>
    return {
      ...defaults,
      ...parsed,
      settings: { ...defaults.settings, ...(parsed.settings ?? {}) },
    }
  } catch {
    return defaults
  }
}

let state: ProgressState = load()
const listeners = new Set<() => void>()

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Storage may be unavailable (private mode); the session still works in memory.
  }
}

function set(next: ProgressState) {
  state = next
  persist()
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useProgress(): ProgressState {
  return useSyncExternalStore(subscribe, () => state, () => state)
}

export function getProgress(): ProgressState {
  return state
}

export const progress = {
  recordAnswer(id: number, rec: AnswerRecord) {
    set({ ...state, answers: { ...state.answers, [id]: rec }, lastId: id })
  },
  clearAnswer(id: number) {
    const answers = { ...state.answers }
    delete answers[id]
    set({ ...state, answers })
  },
  setLast(id: number) {
    if (state.lastId !== id) set({ ...state, lastId: id })
  },
  toggleBookmark(id: number) {
    const has = state.bookmarks.includes(id)
    set({ ...state, bookmarks: has ? state.bookmarks.filter((b) => b !== id) : [...state.bookmarks, id] })
  },
  updateSettings(patch: Partial<Settings>) {
    set({ ...state, settings: { ...state.settings, ...patch } })
  },
  addExam(result: ExamResult) {
    set({ ...state, exams: [result, ...state.exams].slice(0, 50) })
  },
  reset() {
    set({ ...defaults, settings: state.settings })
  },
  export(): string {
    return JSON.stringify(state, null, 2)
  },
  import(json: string): { ok: true } | { ok: false; error: string } {
    try {
      const parsed = JSON.parse(json) as Partial<ProgressState>
      if (!parsed || typeof parsed !== 'object' || typeof parsed.answers !== 'object') {
        return { ok: false, error: 'That file does not look like an exported progress file.' }
      }
      set({
        ...defaults,
        ...parsed,
        settings: { ...defaults.settings, ...(parsed.settings ?? {}) },
      })
      return { ok: true }
    } catch {
      return { ok: false, error: 'Could not read the file as JSON.' }
    }
  },
}

// ---- Exam session (kept separately so a page refresh does not lose a running exam)

export function loadExam(): ExamSession | null {
  try {
    const raw = localStorage.getItem(EXAM_KEY)
    return raw ? (JSON.parse(raw) as ExamSession) : null
  } catch {
    return null
  }
}

export function saveExam(s: ExamSession | null) {
  try {
    if (s) localStorage.setItem(EXAM_KEY, JSON.stringify(s))
    else localStorage.removeItem(EXAM_KEY)
  } catch {
    // ignore
  }
}

// ---- Theme

export function applyTheme(theme: Settings['theme']) {
  const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}
