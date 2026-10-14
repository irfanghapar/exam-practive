import raw from '../data/questions.json'
import type { Comment, GradeBy, Question } from './types'

export const questions = raw as Question[]
export const byId = new Map<number, Question>(questions.map((q) => [q.id, q]))
export const TOTAL = questions.length

const CHUNK = 50
const cache = new Map<number, Promise<Record<string, Comment[]>>>()

/** Discussion comments live in public/discussions/<chunk>.json, 50 questions per file. */
export function loadDiscussion(id: number): Promise<Comment[]> {
  const chunk = Math.floor((id - 1) / CHUNK)
  let p = cache.get(chunk)
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}discussions/${chunk}.json`).then((r) => {
      if (!r.ok) throw new Error(`Could not load discussion (${r.status})`)
      return r.json() as Promise<Record<string, Comment[]>>
    })
    cache.set(chunk, p)
  }
  return p.then((d) => d[String(id)] ?? [])
}

export function sortLetters(letters: string[] | string): string {
  const arr = typeof letters === 'string' ? letters.split('') : letters
  return [...arr].sort().join('')
}

/** The answer a question is graded against under the given setting. */
export function expectedAnswer(q: Question, gradeBy: GradeBy): string {
  if (gradeBy === 'community' && q.community) return sortLetters(q.community)
  return q.answer
}

export function isCorrect(q: Question, picked: string[], gradeBy: GradeBy): boolean {
  return sortLetters(picked) === expectedAnswer(q, gradeBy)
}

/** True when the top community answer differs from the official one. */
export function isDisputed(q: Question): boolean {
  return !!q.community && sortLetters(q.community) !== q.answer
}

export interface CommunityBar {
  choice: string
  pct: number
}

/**
 * Vote bars to show: the source's distribution when it has one, otherwise
 * a distribution built from the "Selected Answer" lines in the discussion.
 */
export function communityBars(q: Question): { bars: CommunityBar[]; source: 'votes' | 'comments' | null; n: number } {
  if (q.votes.length) {
    const bars = [...q.votes].sort((a, b) => b.pct - a.pct)
    if (q.votesOther > 0) bars.push({ choice: 'Other', pct: q.votesOther })
    return { bars, source: 'votes', n: 0 }
  }
  const entries = Object.entries(q.selectedCounts)
  const n = entries.reduce((s, [, c]) => s + c, 0)
  if (!n) return { bars: [], source: null, n: 0 }
  const bars = entries
    .map(([choice, c]) => ({ choice, pct: Math.round((c / n) * 100) }))
    .sort((a, b) => b.pct - a.pct)
  return { bars, source: 'comments', n }
}

export function searchQuestions(term: string, list: Question[] = questions): Question[] {
  const t = term.trim().toLowerCase()
  if (!t) return list
  const n = Number(t)
  if (Number.isInteger(n) && n > 0 && n <= TOTAL) return list.filter((q) => q.id === n)
  const words = t.split(/\s+/)
  return list.filter((q) => {
    const hay = (q.question + ' ' + q.options.map((o) => o.text).join(' ')).toLowerCase()
    return words.every((w) => hay.includes(w))
  })
}

/** Deterministic shuffle so a seed always gives the same order. */
export function shuffled<T>(arr: T[], seed: number): T[] {
  const out = [...arr]
  let s = seed >>> 0 || 1
  const rnd = () => {
    // xorshift32
    s ^= s << 13
    s >>>= 0
    s ^= s >>> 17
    s ^= s << 5
    s >>>= 0
    return s / 4294967296
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
