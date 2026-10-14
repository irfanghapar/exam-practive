import { useEffect, useState } from 'react'
import { loadDiscussion } from '../lib/data'
import type { Comment } from '../lib/types'
import { Button, Pill } from './ui'

function CommentItem({ c, depth }: { c: Comment; depth: number }) {
  return (
    <li className={depth ? 'mt-3 border-l-2 border-line pl-3' : ''}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px]">
        <span className="font-semibold">{c.user}</span>
        {c.badge && <Pill tone={c.badge === 'Highly Voted' ? 'accent' : 'neutral'}>{c.badge}</Pill>}
        {c.selected && <Pill tone="vote">Picked {c.selected}</Pill>}
        <span className="text-muted">{c.time}</span>
      </div>
      <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-ink">{c.body}</p>
      <p className="mt-1 text-[13px] text-muted">
        {c.upvotes} upvote{c.upvotes === 1 ? '' : 's'}
      </p>
      {c.replies.length > 0 && (
        <ul>
          {c.replies.map((r, i) => (
            <CommentItem key={i} c={r} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  )
}

export default function Discussion({ id }: { id: number }) {
  const [comments, setComments] = useState<Comment[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    let alive = true
    loadDiscussion(id)
      .then((c) => alive && setComments([...c].sort((a, b) => b.upvotes - a.upvotes)))
      .catch((e: Error) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [id])

  if (error) return <p className="text-[14px] text-bad">{error} Check your connection and reopen the question.</p>
  if (!comments) return <p className="text-[14px] text-muted">Loading discussion…</p>
  if (!comments.length) return <p className="text-[14px] text-muted">No discussion for this question yet.</p>

  const visible = showAll ? comments : comments.slice(0, 5)
  return (
    <div>
      <ul className="space-y-5">
        {visible.map((c, i) => (
          <CommentItem key={i} c={c} depth={0} />
        ))}
      </ul>
      {comments.length > visible.length && (
        <Button variant="ghost" className="mt-4" onClick={() => setShowAll(true)}>
          Show {comments.length - visible.length} more comments
        </Button>
      )}
    </div>
  )
}
