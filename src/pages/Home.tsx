import { Link } from 'react-router-dom'
import { LinkButton } from '../components/ui'
import { questions, TOTAL } from '../lib/data'
import { useProgress } from '../lib/store'

function Stat({ value, label, tone }: { value: string; label: string; tone?: 'ok' | 'bad' | 'accent' }) {
  const color = tone === 'ok' ? 'text-ok' : tone === 'bad' ? 'text-bad' : tone === 'accent' ? 'text-flag' : 'text-ink'
  return (
    <div>
      <div className={`text-[32px] font-bold leading-none tabular-nums ${color}`}>{value}</div>
      <div className="mt-1 text-[14px] text-muted">{label}</div>
    </div>
  )
}

export default function Home() {
  const p = useProgress()
  const records = Object.values(p.answers)
  const answered = records.length
  const correct = records.filter((r) => r.correct).length
  const wrong = answered - correct
  const accuracy = answered ? Math.round((correct / answered) * 100) : 0
  const bookmarks = p.bookmarks.length
  const recentExams = p.exams.slice(0, 5)

  return (
    <div>
      <section>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">AWS Certified Cloud Practitioner CLF-C02</h1>
        <p className="mt-1 text-[16px] text-ink-2">
          {TOTAL} questions with the official answer, the community vote and the discussion behind each one. Answer first, then reveal.
        </p>
      </section>

      <section className="mt-6" aria-label="Progress map">
        <div className="qmap">
          {questions.map((q) => {
            const r = p.answers[q.id]
            const s = r ? (r.correct ? 'ok' : 'bad') : 'none'
            return (
              <Link
                key={q.id}
                to={`/practice/${q.id}`}
                data-s={s}
                data-b={p.bookmarks.includes(q.id) ? '1' : undefined}
                title={`Question ${q.id}${r ? (r.correct ? ' · correct' : ' · wrong') : ''}`}
                aria-label={`Question ${q.id}`}
              />
            )
          })}
        </div>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
          <span>
            <i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-ok align-middle" /> correct
          </span>
          <span>
            <i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-bad align-middle" /> wrong
          </span>
          <span>
            <i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-surface-2 align-middle" /> not yet answered
          </span>
          <span>
            <i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-surface-2 align-middle shadow-[inset_0_0_0_2px_var(--accent)]" /> bookmarked
          </span>
        </p>
      </section>

      <section className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
        <Stat value={`${answered}`} label={`of ${TOTAL} answered`} />
        <Stat value={`${accuracy}%`} label="accuracy" tone={answered ? (accuracy >= 70 ? 'ok' : 'bad') : undefined} />
        <Stat value={`${wrong}`} label="to review" tone={wrong ? 'bad' : undefined} />
        <Stat value={`${bookmarks}`} label="bookmarked" tone={bookmarks ? 'accent' : undefined} />
      </section>

      <section className="mt-8 flex flex-wrap gap-2">
        <LinkButton to="/practice?set=unanswered" variant="primary">
          {answered ? 'Continue practice' : 'Start practice'}
        </LinkButton>
        <LinkButton to="/practice?set=random">Random order</LinkButton>
        {wrong > 0 && <LinkButton to="/practice?set=wrong">Review wrong answers</LinkButton>}
        <LinkButton to="/exam">Exam simulation</LinkButton>
      </section>

      {recentExams.length > 0 && (
        <section className="mt-10">
          <h2 className="text-[18px] font-bold">Recent exams</h2>
          <ul className="mt-2 divide-y divide-line">
            {recentExams.map((e) => {
              const pct = Math.round((e.correct / e.ids.length) * 100)
              return (
                <li key={e.id}>
                  <Link to={`/exam/result/${e.id}`} className="flex items-center gap-3 py-2.5 hover:bg-surface-2 -mx-2 px-2 rounded-md">
                    <span className={`w-14 text-[20px] font-bold tabular-nums ${pct >= 70 ? 'text-ok' : 'text-bad'}`}>{pct}%</span>
                    <span className="text-ink-2">
                      {e.correct}/{e.ids.length} correct
                    </span>
                    <span className="ml-auto text-[14px] text-muted">{new Date(e.finishedAt).toLocaleDateString()}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section className="mt-10 text-[14px] text-muted">
        <p>
          Questions come from a community question bank, so an official answer can be wrong. When the community vote disagrees, the app says so;
          you can also grade against the community answer in <Link to="/settings" className="underline">Settings</Link>. Progress is saved in this browser only.
        </p>
      </section>
    </div>
  )
}
