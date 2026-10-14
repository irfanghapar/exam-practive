import { communityBars } from '../lib/data'
import type { Question } from '../lib/types'

export default function VoteBars({ q }: { q: Question }) {
  const { bars, source, n } = communityBars(q)
  if (!bars.length) {
    return <p className="text-[14px] text-muted">No community votes recorded for this question.</p>
  }
  return (
    <div>
      <ul className="space-y-1.5">
        {bars.map((b, i) => (
          <li key={b.choice} className="flex items-center gap-2 text-[14px]">
            <span className={`w-12 shrink-0 font-semibold ${i === 0 ? 'text-vote' : 'text-ink-2'}`}>{b.choice}</span>
            <span className="h-2.5 flex-1 rounded-full bg-surface-2 overflow-hidden">
              <span
                className={`bar-fill block h-full rounded-full ${i === 0 ? 'bg-vote' : 'bg-vote/40'}`}
                style={{ width: `${Math.max(b.pct, 2)}%`, animationDelay: `${i * 60}ms` }}
              />
            </span>
            <span className="w-10 text-right tabular-nums text-ink-2">{b.pct}%</span>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-[13px] text-muted">
        {source === 'votes' ? 'Community vote distribution from the question bank.' : `Based on ${n} answer${n === 1 ? '' : 's'} picked in the discussion.`}
      </p>
    </div>
  )
}
