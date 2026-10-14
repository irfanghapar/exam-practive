import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AnswerPanel, Options, QuestionStem } from '../components/QuestionView'
import { Button, Kbd, LinkButton } from '../components/ui'
import { byId, isCorrect, TOTAL } from '../lib/data'
import { isSetName, neighbours, setLabels, setQuestions, type SetName } from '../lib/sets'
import { progress, useProgress } from '../lib/store'
import type { Question } from '../lib/types'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

/** /practice with no id: continue from the next unanswered question after the last one visited. */
export function PracticeEntry() {
  const p = useProgress()
  const [params] = useSearchParams()
  const set: SetName = isSetName(params.get('set')) ? (params.get('set') as SetName) : 'all'
  const list = setQuestions(set, p)
  let target: number | undefined
  if (set === 'random' || set === 'all') {
    target = list.find((q) => q.id > p.lastId && !p.answers[q.id])?.id ?? list.find((q) => !p.answers[q.id])?.id ?? list[0]?.id
  } else {
    target = list.find((q) => q.id > p.lastId)?.id ?? list[0]?.id
  }
  if (!target) {
    return (
      <div className="py-10 text-center">
        <h1 className="text-[24px] font-bold">Nothing in “{setLabels[set]}” right now</h1>
        <p className="mt-2 text-ink-2">Pick another set, or browse all questions.</p>
        <div className="mt-5 flex justify-center gap-2">
          <LinkButton to="/practice?set=all" variant="primary">
            Practice all questions
          </LinkButton>
          <LinkButton to="/browse">Browse</LinkButton>
        </div>
      </div>
    )
  }
  return <Navigate to={`/practice/${target}?set=${set}`} replace />
}

export default function Practice() {
  const { id: idParam } = useParams()
  const id = Number(idParam)
  const q = byId.get(id)
  if (!q) {
    return (
      <div className="py-10 text-center">
        <h1 className="text-[24px] font-bold">No question #{idParam}</h1>
        <p className="mt-2 text-ink-2">Questions run from 1 to {TOTAL}.</p>
        <div className="mt-5">
          <LinkButton to="/practice/1" variant="primary">
            Go to question 1
          </LinkButton>
        </div>
      </div>
    )
  }
  return <PracticeQuestion key={q.id} q={q} />
}

function PracticeQuestion({ q }: { q: Question }) {
  const p = useProgress()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const set: SetName = isSetName(params.get('set')) ? (params.get('set') as SetName) : 'all'
  const stored = p.answers[q.id]
  const gradeBy = p.settings.gradeBy

  const [picked, setPicked] = useState<string[]>(stored?.picked ?? [])
  const [revealed, setRevealed] = useState<boolean>(!!stored)
  const [discussionOpen, setDiscussionOpen] = useState(false)
  const [jump, setJump] = useState('')
  const bookmarked = p.bookmarks.includes(q.id)

  useEffect(() => {
    progress.setLast(q.id)
    window.scrollTo({ top: 0 })
  }, [q.id])

  const nav = useMemo(() => neighbours(set, q.id, p), [set, q.id, p])

  const pick = (key: string) => {
    if (revealed) return
    setPicked((cur) => {
      if (!q.multi) return [key]
      if (cur.includes(key)) return cur.filter((k) => k !== key)
      if (cur.length >= q.answer.length) return [...cur.slice(1), key]
      return [...cur, key]
    })
  }

  const check = () => {
    if (!picked.length || revealed) return
    progress.recordAnswer(q.id, { picked, correct: isCorrect(q, picked, gradeBy), at: Date.now(), gradedBy: gradeBy })
    setRevealed(true)
  }

  const peek = () => setRevealed(true)

  const retry = () => {
    setPicked([])
    setRevealed(false)
    setDiscussionOpen(false)
  }

  const go = (target: number | null) => {
    if (target) navigate(`/practice/${target}?set=${set}`)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toUpperCase()
      const li = LETTERS.indexOf(k)
      const ni = /^[1-6]$/.test(k) ? Number(k) - 1 : -1
      const idx = li >= 0 ? li : ni
      if (!revealed && idx >= 0 && idx < q.options.length) {
        pick(q.options[idx].key)
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (revealed) go(nav.next)
        else check()
      } else if (e.key === 'ArrowRight') go(nav.next)
      else if (e.key === 'ArrowLeft') go(nav.prev)
      else if (k === 'M') progress.toggleBookmark(q.id)
      else if (k === 'D' && revealed) setDiscussionOpen((v) => !v)
      else if (k === 'R' && revealed) retry()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const position = nav.index >= 0 ? `${nav.index + 1} of ${nav.total}` : `${nav.total} left`

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-[15px] font-semibold text-ink-2">
          Question {q.id} <span className="font-normal text-muted">of {TOTAL}</span>
        </h1>
        <select
          aria-label="Practice set"
          value={set}
          onChange={(e) => setParams({ set: e.target.value })}
          className="h-8 rounded-md border border-line bg-surface px-2 text-[14px] text-ink"
        >
          {(Object.keys(setLabels) as SetName[]).map((s) => (
            <option key={s} value={s}>
              {setLabels[s]}
            </option>
          ))}
        </select>
        <span className="text-[14px] text-muted">{position}</span>
        <button
          type="button"
          onClick={() => progress.toggleBookmark(q.id)}
          aria-pressed={bookmarked}
          className={`ml-auto inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[14px] ${
            bookmarked ? 'bg-accent-soft text-flag font-semibold' : 'text-ink-2 hover:bg-surface-2'
          }`}
        >
          <span aria-hidden>{bookmarked ? '★' : '☆'}</span>
          {bookmarked ? 'Bookmarked' : 'Bookmark'}
        </button>
      </div>

      <div className="mt-5">
        <QuestionStem q={q} />
        <Options q={q} picked={picked} onPick={pick} revealed={revealed} gradeBy={gradeBy} />
      </div>

      {!revealed ? (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={check} disabled={picked.length === 0}>
            Check answer
          </Button>
          <Button variant="ghost" onClick={peek}>
            Reveal without answering
          </Button>
          <span className="ml-auto hidden text-[13px] text-muted sm:inline">
            <Kbd>A</Kbd>–<Kbd>E</Kbd> pick · <Kbd>Enter</Kbd> check
          </span>
        </div>
      ) : (
        <>
          <AnswerPanel
            q={q}
            picked={picked}
            gradeBy={gradeBy}
            discussionOpen={discussionOpen}
            onToggleDiscussion={() => setDiscussionOpen((v) => !v)}
          />
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button variant="primary" onClick={() => go(nav.next)} disabled={!nav.next}>
              Next question
            </Button>
            <Button variant="ghost" onClick={retry}>
              Try again
            </Button>
            <span className="ml-auto hidden text-[13px] text-muted sm:inline">
              <Kbd>Enter</Kbd> next · <Kbd>D</Kbd> discussion · <Kbd>M</Kbd> bookmark
            </span>
          </div>
        </>
      )}

      <nav className="mt-10 flex items-center gap-1 border-t border-line pt-4 text-[14px] sm:gap-2">
        <Button variant="ghost" className="whitespace-nowrap px-3" onClick={() => go(nav.prev)} disabled={!nav.prev}>
          ← Prev
        </Button>
        <Button variant="ghost" className="whitespace-nowrap px-3" onClick={() => go(nav.next)} disabled={!nav.next}>
          Next →
        </Button>
        <form
          className="ml-auto flex items-center gap-1.5 whitespace-nowrap"
          onSubmit={(e) => {
            e.preventDefault()
            const n = Number(jump)
            if (n >= 1 && n <= TOTAL) {
              navigate(`/practice/${n}?set=${set}`)
              setJump('')
            }
          }}
        >
          <label htmlFor="jump" className="text-muted">
            Go to
          </label>
          <input
            id="jump"
            inputMode="numeric"
            value={jump}
            onChange={(e) => setJump(e.target.value.replace(/\D/g, ''))}
            placeholder="#"
            className="h-8 w-16 rounded-md border border-line bg-surface px-2 text-ink"
          />
        </form>
        <Link to="/browse" className="text-ink-2 hover:text-ink">
          Browse
        </Link>
      </nav>
    </div>
  )
}
