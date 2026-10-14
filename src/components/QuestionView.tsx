import { useState } from 'react'
import { expectedAnswer, isCorrect, isDisputed, sortLetters } from '../lib/data'
import type { GradeBy, Question } from '../lib/types'
import Discussion from './Discussion'
import { Button, Letters, Pill } from './ui'
import VoteBars from './VoteBars'

export function QuestionStem({ q }: { q: Question }) {
  return (
    <div>
      <p className="whitespace-pre-line text-[19px] leading-snug text-ink">{q.question}</p>
      {q.multi && (
        <p className="mt-2 text-[14px] font-semibold text-flag">
          Choose {q.answer.length === 3 ? 'three' : 'two'} answers
        </p>
      )}
    </div>
  )
}

export function Options({
  q,
  picked,
  onPick,
  revealed,
  gradeBy,
}: {
  q: Question
  picked: string[]
  onPick: (key: string) => void
  revealed: boolean
  gradeBy: GradeBy
}) {
  const expected = revealed ? expectedAnswer(q, gradeBy) : ''
  return (
    <ul className="mt-5 space-y-2" role={q.multi ? 'group' : 'radiogroup'}>
      {q.options.map((o) => {
        const isPicked = picked.includes(o.key)
        const isRight = expected.includes(o.key)
        let cls = 'border-line bg-surface hover:border-ink-2'
        if (revealed) {
          if (isRight) cls = 'border-ok bg-ok-soft'
          else if (isPicked) cls = 'border-bad bg-bad-soft'
          else cls = 'border-line bg-surface opacity-70'
        } else if (isPicked) {
          cls = 'border-accent bg-accent-soft'
        }
        let badge = 'bg-surface-2 text-ink'
        if (revealed && isRight) badge = 'bg-ok text-white'
        else if (revealed && isPicked) badge = 'bg-bad text-white'
        else if (isPicked) badge = 'bg-accent text-accent-ink'
        return (
          <li key={o.key}>
            <button
              type="button"
              role={q.multi ? 'checkbox' : 'radio'}
              aria-checked={isPicked}
              disabled={revealed}
              onClick={() => onPick(o.key)}
              className={`flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left text-[16px] leading-snug transition-colors disabled:cursor-default ${cls}`}
            >
              <span className={`mt-px inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[15px] font-bold ${badge}`}>
                {o.key}
              </span>
              <span className="pt-0.5">{o.text}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function AnswerPanel({
  q,
  picked,
  gradeBy,
  withDiscussion = true,
  discussionOpen,
  onToggleDiscussion,
}: {
  q: Question
  picked: string[]
  gradeBy: GradeBy
  withDiscussion?: boolean
  discussionOpen?: boolean
  onToggleDiscussion?: () => void
}) {
  const [localOpen, setLocalOpen] = useState(false)
  const open = discussionOpen ?? localOpen
  const toggle = onToggleDiscussion ?? (() => setLocalOpen((v) => !v))
  const correct = isCorrect(q, picked, gradeBy)
  const disputed = isDisputed(q)
  const officialMatch = sortLetters(picked) === q.answer
  const communityMatch = !!q.community && sortLetters(picked) === sortLetters(q.community)

  return (
    <section className="reveal mt-6 rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className={`text-[20px] font-bold ${correct ? 'text-ok' : 'text-bad'}`}>
          {picked.length === 0 ? 'Skipped' : correct ? 'Correct' : 'Not quite'}
        </h2>
        {disputed && (
          <Pill tone="accent" title="The most-voted community answer differs from the official answer">
            Community disagrees
          </Pill>
        )}
        {!correct && picked.length > 0 && (officialMatch || communityMatch) && (
          <span className="text-[14px] text-ink-2">
            {officialMatch ? 'Matches the official answer' : 'Matches the community answer'}
          </span>
        )}
      </div>

      <div className="mt-4 grid gap-5 sm:grid-cols-[auto_1fr] sm:gap-8">
        <div>
          <p className="text-[14px] text-muted">Official answer</p>
          <div className="mt-1.5">
            <Letters letters={q.answer} tone="ok" />
          </div>
          {q.community && (
            <>
              <p className="mt-4 text-[14px] text-muted">Community answer</p>
              <div className="mt-1.5">
                <Letters letters={sortLetters(q.community)} tone="vote" />
              </div>
            </>
          )}
        </div>
        <div>
          <p className="mb-1.5 text-[14px] text-muted">Community votes</p>
          <VoteBars q={q} />
        </div>
      </div>

      {withDiscussion && q.commentCount === 0 && (
        <p className="mt-5 border-t border-line pt-4 text-[14px] text-muted">No discussion for this question.</p>
      )}
      {withDiscussion && q.commentCount > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <Button variant="ghost" className="-ml-2" onClick={toggle} aria-expanded={open}>
            <span aria-hidden className={`inline-block transition-transform ${open ? 'rotate-90' : ''}`}>
              ▸
            </span>
            {open ? 'Hide discussion' : `Show discussion (${q.commentCount})`}
          </Button>
          {open && (
            <div className="mt-3">
              <Discussion key={q.id} id={q.id} />
            </div>
          )}
        </div>
      )}
    </section>
  )
}
