import { isDisputed, questions, shuffled } from './data'
import type { ProgressState, Question } from './types'

export type SetName = 'all' | 'unanswered' | 'wrong' | 'correct' | 'bookmarked' | 'multi' | 'disputed' | 'random'

export const setLabels: Record<SetName, string> = {
  all: 'All questions',
  unanswered: 'Unanswered',
  wrong: 'Wrong answers',
  correct: 'Correct answers',
  bookmarked: 'Bookmarked',
  multi: 'Multiple answers',
  disputed: 'Community disagrees',
  random: 'Random order',
}

export function isSetName(s: string | null): s is SetName {
  return !!s && s in setLabels
}

function randomSeed(): number {
  try {
    const k = 'exam-practive:seed'
    const v = sessionStorage.getItem(k)
    if (v) return Number(v)
    const seed = Math.floor(Math.random() * 2 ** 31)
    sessionStorage.setItem(k, String(seed))
    return seed
  } catch {
    return 12345
  }
}

/** The ordered list of questions in a practice set. */
export function setQuestions(set: SetName, p: ProgressState): Question[] {
  switch (set) {
    case 'all':
      return questions
    case 'unanswered':
      return questions.filter((q) => !p.answers[q.id])
    case 'wrong':
      return questions.filter((q) => p.answers[q.id] && !p.answers[q.id].correct)
    case 'correct':
      return questions.filter((q) => p.answers[q.id]?.correct)
    case 'bookmarked':
      return questions.filter((q) => p.bookmarks.includes(q.id))
    case 'multi':
      return questions.filter((q) => q.multi)
    case 'disputed':
      return questions.filter(isDisputed)
    case 'random':
      return shuffled(questions, randomSeed())
  }
}

/** Next and previous question ids relative to `id` inside a set. */
export function neighbours(set: SetName, id: number, p: ProgressState): { prev: number | null; next: number | null; index: number; total: number } {
  const list = setQuestions(set, p)
  const total = list.length
  if (set === 'random') {
    const i = list.findIndex((q) => q.id === id)
    return {
      prev: i > 0 ? list[i - 1].id : null,
      next: i >= 0 && i < total - 1 ? list[i + 1].id : null,
      index: i,
      total,
    }
  }
  // Ordered sets: the current question may have just left the set (e.g. it was
  // answered in the "unanswered" set), so look for the nearest ids around it.
  let prev: number | null = null
  let next: number | null = null
  let index = -1
  for (let i = 0; i < list.length; i++) {
    const qid = list[i].id
    if (qid < id) prev = qid
    else if (qid === id) index = i
    else {
      next = qid
      break
    }
  }
  return { prev, next, index, total }
}
