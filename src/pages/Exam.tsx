import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { AnswerPanel, Options, QuestionStem } from '../components/QuestionView'
import { Button, LinkButton, Pill } from '../components/ui'
import { byId, isCorrect, questions, shuffled, TOTAL } from '../lib/data'
import { loadExam, progress, saveExam, useProgress } from '../lib/store'
import type { ExamResult, ExamSession } from '../lib/types'

const PASS_LINE = 70

// ---------- Setup

export function ExamSetup() {
  const p = useProgress()
  const navigate = useNavigate()
  const existing = loadExam()
  const [count, setCount] = useState(65)
  const [minutes, setMinutes] = useState(90)
  const [pool, setPool] = useState<'all' | 'unanswered' | 'wrong'>('all')

  const poolSize =
    pool === 'all' ? TOTAL : pool === 'unanswered' ? questions.filter((q) => !p.answers[q.id]).length : questions.filter((q) => p.answers[q.id] && !p.answers[q.id].correct).length
  const n = Math.min(count, poolSize)

  const start = () => {
    let src = questions
    if (pool === 'unanswered') src = questions.filter((q) => !p.answers[q.id])
    if (pool === 'wrong') src = questions.filter((q) => p.answers[q.id] && !p.answers[q.id].correct)
    const ids = shuffled(src, Date.now() % 2 ** 31)
      .slice(0, n)
      .map((q) => q.id)
    const session: ExamSession = {
      id: String(Date.now()),
      ids,
      startedAt: Date.now(),
      minutes,
      answers: {},
      flagged: [],
      index: 0,
    }
    saveExam(session)
    navigate('/exam/run')
  }

  return (
    <div>
      <h1 className="text-[24px] font-bold">Exam simulation</h1>
      <p className="mt-1 text-ink-2">
        The real exam is 65 questions in 90 minutes. Answers are only revealed when you submit.
      </p>

      {existing && (
        <div className="mt-5 rounded-xl border border-accent/40 bg-accent-soft p-4">
          <p className="font-semibold">An exam is already in progress</p>
          <p className="mt-0.5 text-[14px] text-ink-2">
            {Object.keys(existing.answers).length} of {existing.ids.length} answered.
          </p>
          <div className="mt-3 flex gap-2">
            <LinkButton to="/exam/run" variant="primary">
              Resume
            </LinkButton>
            <Button
              onClick={() => {
                saveExam(null)
                navigate('/exam', { replace: true })
              }}
            >
              Discard it
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        <fieldset>
          <legend className="text-[14px] text-muted">Questions</legend>
          <div className="mt-1.5 flex gap-1.5">
            {[20, 35, 65].map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={count === c}
                onClick={() => setCount(c)}
                className={`h-9 flex-1 rounded-md border text-[15px] ${count === c ? 'border-ink bg-ink text-bg font-semibold' : 'border-line bg-surface text-ink-2'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-[14px] text-muted">Time limit</legend>
          <div className="mt-1.5 flex gap-1.5">
            {[
              [0, 'None'],
              [45, '45 min'],
              [90, '90 min'],
            ].map(([m, label]) => (
              <button
                key={m}
                type="button"
                aria-pressed={minutes === m}
                onClick={() => setMinutes(Number(m))}
                className={`h-9 flex-1 rounded-md border text-[15px] ${minutes === m ? 'border-ink bg-ink text-bg font-semibold' : 'border-line bg-surface text-ink-2'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-[14px] text-muted">Draw from</legend>
          <select
            value={pool}
            onChange={(e) => setPool(e.target.value as typeof pool)}
            className="mt-1.5 h-9 w-full rounded-md border border-line bg-surface px-2 text-[15px] text-ink"
          >
            <option value="all">All questions</option>
            <option value="unanswered">Unanswered only</option>
            <option value="wrong">Wrong answers only</option>
          </select>
        </fieldset>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button variant="primary" onClick={start} disabled={n === 0}>
          Start {n} question{n === 1 ? '' : 's'}
        </Button>
        {n < count && <span className="text-[14px] text-muted">Only {poolSize} available in that pool.</span>}
      </div>
    </div>
  )
}

// ---------- Running exam

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

export function ExamRun() {
  const navigate = useNavigate()
  const [session, setSession] = useState<ExamSession | null>(() => loadExam())
  const [now, setNow] = useState(Date.now())
  const [confirm, setConfirm] = useState(false)
  const gradeBy = useProgress().settings.gradeBy

  const update = (patch: Partial<ExamSession>) => {
    setSession((s) => {
      if (!s) return s
      const next = { ...s, ...patch }
      saveExam(next)
      return next
    })
  }

  const deadline = session && session.minutes ? session.startedAt + session.minutes * 60_000 : null

  const submit = () => {
    if (!session) return
    let correct = 0
    for (const id of session.ids) {
      const q = byId.get(id)!
      const picked = session.answers[id] ?? []
      const ok = isCorrect(q, picked, gradeBy)
      if (ok) correct++
      if (picked.length) progress.recordAnswer(id, { picked, correct: ok, at: Date.now(), gradedBy: gradeBy })
    }
    const result: ExamResult = {
      id: session.id,
      startedAt: session.startedAt,
      finishedAt: Date.now(),
      ids: session.ids,
      answers: session.answers,
      correct,
    }
    progress.addExam(result)
    saveExam(null)
    navigate(`/exam/result/${result.id}`, { replace: true })
  }

  useEffect(() => {
    if (!deadline) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [deadline])

  useEffect(() => {
    if (deadline && now >= deadline) submit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, deadline])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [session?.index])

  if (!session) return <Navigate to="/exam" replace />

  const q = byId.get(session.ids[session.index])!
  const picked = session.answers[q.id] ?? []
  const answeredCount = Object.values(session.answers).filter((a) => a.length).length
  const flagged = session.flagged.includes(q.id)
  const remaining = deadline ? deadline - now : null
  const low = remaining !== null && remaining < 5 * 60_000

  const pick = (key: string) => {
    let next: string[]
    if (!q.multi) next = [key]
    else if (picked.includes(key)) next = picked.filter((k) => k !== key)
    else if (picked.length >= q.answer.length) next = [...picked.slice(1), key]
    else next = [...picked, key]
    update({ answers: { ...session.answers, [q.id]: next } })
  }

  const goto = (i: number) => {
    if (i >= 0 && i < session.ids.length) update({ index: i })
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[15px] font-semibold text-ink-2">
          {session.index + 1} <span className="font-normal text-muted">of {session.ids.length}</span>
        </span>
        <span className="text-[14px] text-muted">{answeredCount} answered</span>
        {remaining !== null && (
          <span className={`text-[15px] font-semibold tabular-nums ${low ? 'text-bad' : 'text-ink'}`} aria-live="polite">
            {fmt(remaining)} left
          </span>
        )}
        <button
          type="button"
          onClick={() => update({ flagged: flagged ? session.flagged.filter((f) => f !== q.id) : [...session.flagged, q.id] })}
          aria-pressed={flagged}
          className={`ml-auto inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[14px] ${
            flagged ? 'bg-accent-soft text-flag font-semibold' : 'text-ink-2 hover:bg-surface-2'
          }`}
        >
          <span aria-hidden>⚑</span>
          {flagged ? 'Flagged' : 'Flag for review'}
        </button>
      </div>

      <div className="mt-5">
        <QuestionStem q={q} />
        <Options q={q} picked={picked} onPick={pick} revealed={false} gradeBy={gradeBy} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button onClick={() => goto(session.index - 1)} disabled={session.index === 0}>
          ← Previous
        </Button>
        <Button variant="primary" onClick={() => goto(session.index + 1)} disabled={session.index === session.ids.length - 1}>
          Next →
        </Button>
        {!confirm ? (
          <Button variant="ghost" className="ml-auto" onClick={() => setConfirm(true)}>
            Submit exam
          </Button>
        ) : (
          <span className="ml-auto flex items-center gap-2 text-[14px]">
            <span className="text-ink-2">
              {answeredCount < session.ids.length ? `${session.ids.length - answeredCount} unanswered. ` : ''}Submit now?
            </span>
            <Button variant="primary" onClick={submit}>
              Submit
            </Button>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Keep going
            </Button>
          </span>
        )}
      </div>

      <div className="mt-8 border-t border-line pt-4">
        <p className="text-[13px] text-muted">Jump to a question</p>
        <ol className="mt-2 flex flex-wrap gap-1.5">
          {session.ids.map((id, i) => {
            const done = (session.answers[id] ?? []).length > 0
            const isFlag = session.flagged.includes(id)
            const cur = i === session.index
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => goto(i)}
                  aria-current={cur ? 'true' : undefined}
                  className={`h-8 w-9 rounded-md text-[13px] tabular-nums ${
                    cur ? 'bg-ink text-bg font-semibold' : done ? 'bg-surface-2 text-ink' : 'border border-line text-muted'
                  } ${isFlag ? 'shadow-[inset_0_0_0_2px_var(--accent)]' : ''}`}
                >
                  {i + 1}
                </button>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

// ---------- Result

export function ExamResultPage() {
  const { id } = useParams()
  const p = useProgress()
  const result = p.exams.find((e) => e.id === id)
  const [open, setOpen] = useState<number | null>(null)
  const [filter, setFilter] = useState<'all' | 'wrong'>('all')
  const gradeBy = p.settings.gradeBy

  const rows = useMemo(() => {
    if (!result) return []
    return result.ids.map((qid) => {
      const q = byId.get(qid)!
      const picked = result.answers[qid] ?? []
      return { q, picked, ok: isCorrect(q, picked, gradeBy) }
    })
  }, [result, gradeBy])

  if (!result) {
    return (
      <div className="py-10 text-center">
        <h1 className="text-[24px] font-bold">That exam result is not here</h1>
        <p className="mt-2 text-ink-2">Results are saved in this browser only.</p>
        <div className="mt-5">
          <LinkButton to="/exam" variant="primary">
            Start a new exam
          </LinkButton>
        </div>
      </div>
    )
  }

  const pct = Math.round((result.correct / result.ids.length) * 100)
  const passed = pct >= PASS_LINE
  const mins = Math.round((result.finishedAt - result.startedAt) / 60_000)
  const shown = filter === 'wrong' ? rows.filter((r) => !r.ok) : rows

  return (
    <div>
      <h1 className="text-[24px] font-bold">Exam result</h1>
      <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <div className={`text-[48px] font-bold leading-none tabular-nums ${passed ? 'text-ok' : 'text-bad'}`}>{pct}%</div>
          <div className="mt-1 text-[14px] text-muted">
            {result.correct} of {result.ids.length} correct · {mins} min
          </div>
        </div>
        <p className="max-w-sm text-[15px] text-ink-2">
          {passed ? 'Above' : 'Below'} the {PASS_LINE}% line. The real exam uses a scaled score (700 of 1000), which usually works out close to 70%.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <LinkButton to="/exam" variant="primary">
          New exam
        </LinkButton>
        <Link to="/" className="text-[15px] text-ink-2 underline hover:text-ink">
          Overview
        </Link>
        <div className="ml-auto flex gap-1.5">
          {(['all', 'wrong'] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`h-8 rounded-full px-3 text-[14px] ${filter === f ? 'bg-ink text-bg font-semibold' : 'bg-surface-2 text-ink-2'}`}
            >
              {f === 'all' ? 'All' : 'Wrong only'}
            </button>
          ))}
        </div>
      </div>

      <ol className="mt-4 divide-y divide-line">
        {shown.map(({ q, picked, ok }, i) => (
          <li key={q.id}>
            <button
              type="button"
              onClick={() => setOpen(open === q.id ? null : q.id)}
              aria-expanded={open === q.id}
              className="-mx-2 flex w-full items-start gap-3 rounded-md px-2 py-3 text-left hover:bg-surface-2"
            >
              <span className={`mt-0.5 w-6 shrink-0 text-[15px] font-bold ${ok ? 'text-ok' : 'text-bad'}`}>{ok ? '✓' : '✗'}</span>
              <span className="w-8 shrink-0 text-[14px] tabular-nums text-muted">{filter === 'all' ? i + 1 : ''}</span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-[15px] leading-snug">{q.question}</span>
                <span className="mt-1 flex gap-1.5 text-[13px]">
                  <Pill tone={ok ? 'ok' : 'bad'}>{picked.length ? `You: ${[...picked].sort().join('')}` : 'Skipped'}</Pill>
                  <Pill>Q{q.id}</Pill>
                </span>
              </span>
            </button>
            {open === q.id && (
              <div className="pb-6 pt-1">
                <QuestionStem q={q} />
                <Options q={q} picked={picked} onPick={() => {}} revealed gradeBy={gradeBy} />
                <AnswerPanel q={q} picked={picked} gradeBy={gradeBy} />
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
