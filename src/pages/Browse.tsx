import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Pill } from '../components/ui'
import { isDisputed, searchQuestions } from '../lib/data'
import { isSetName, setLabels, setQuestions, type SetName } from '../lib/sets'
import { useProgress } from '../lib/store'

const filters: SetName[] = ['all', 'unanswered', 'wrong', 'correct', 'bookmarked', 'multi', 'disputed']
const PAGE = 100

export default function Browse() {
  const p = useProgress()
  const [params, setParams] = useSearchParams()
  const set: SetName = isSetName(params.get('set')) ? (params.get('set') as SetName) : 'all'
  const term = params.get('q') ?? ''
  const [limit, setLimit] = useState(PAGE)

  const list = useMemo(() => searchQuestions(term, setQuestions(set, p)), [term, set, p])

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    setParams(next, { replace: true })
    setLimit(PAGE)
  }

  return (
    <div>
      <h1 className="text-[24px] font-bold">Browse questions</h1>
      <input
        type="search"
        value={term}
        onChange={(e) => update({ q: e.target.value })}
        placeholder="Search text, or type a question number"
        aria-label="Search questions"
        className="mt-3 h-11 w-full rounded-lg border border-line bg-surface px-3 text-[16px] text-ink placeholder:text-muted"
      />
      <div className="mt-3 flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => update({ set: f === 'all' ? '' : f })}
            aria-pressed={set === f}
            className={`h-8 rounded-full px-3 text-[14px] ${set === f ? 'bg-ink text-bg font-semibold' : 'bg-surface-2 text-ink-2 hover:text-ink'}`}
          >
            {setLabels[f]}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[14px] text-muted">
        {list.length} question{list.length === 1 ? '' : 's'}
      </p>

      {list.length === 0 ? (
        <p className="mt-6 text-ink-2">Nothing matches. Try fewer words, or clear the filter.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {list.slice(0, limit).map((q) => {
            const r = p.answers[q.id]
            const dot = r ? (r.correct ? 'bg-ok' : 'bg-bad') : 'bg-line'
            return (
              <li key={q.id}>
                <Link
                  to={`/practice/${q.id}?set=${set}`}
                  className="-mx-2 flex items-start gap-3 rounded-md px-2 py-3 hover:bg-surface-2"
                >
                  <span className="mt-2 inline-block h-2.5 w-2.5 shrink-0 rounded-full" aria-hidden>
                    <span className={`block h-full w-full rounded-full ${dot}`} />
                  </span>
                  <span className="w-10 shrink-0 pt-0.5 text-[15px] font-semibold tabular-nums text-ink-2">{q.id}</span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-[15px] leading-snug text-ink">{q.question}</span>
                    <span className="mt-1.5 flex flex-wrap gap-1.5">
                      {q.multi && <Pill>Choose {q.answer.length}</Pill>}
                      {isDisputed(q) && <Pill tone="accent">Community disagrees</Pill>}
                      {p.bookmarks.includes(q.id) && <Pill tone="accent">★</Pill>}
                      {q.commentCount > 0 && <Pill>{q.commentCount} comments</Pill>}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      {list.length > limit && (
        <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="mt-4 text-[15px] text-ink-2 underline hover:text-ink">
          Show {Math.min(PAGE, list.length - limit)} more
        </button>
      )}
    </div>
  )
}
