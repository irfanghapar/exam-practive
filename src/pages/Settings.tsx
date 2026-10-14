import { useRef, useState } from 'react'
import { Button } from '../components/ui'
import { questions } from '../lib/data'
import { isDisputed } from '../lib/data'
import { applyTheme, progress, useProgress } from '../lib/store'
import type { GradeBy, Theme } from '../lib/types'

function Choice<T extends string>({
  name,
  value,
  current,
  onChange,
  title,
  detail,
}: {
  name: string
  value: T
  current: T
  onChange: (v: T) => void
  title: string
  detail?: string
}) {
  const on = value === current
  return (
    <label className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${on ? 'border-ink bg-surface' : 'border-line bg-surface hover:border-ink-2'}`}>
      <input type="radio" name={name} checked={on} onChange={() => onChange(value)} className="mt-1 accent-[var(--accent)]" />
      <span>
        <span className="block text-[15px] font-semibold">{title}</span>
        {detail && <span className="block text-[14px] text-ink-2">{detail}</span>}
      </span>
    </label>
  )
}

export default function Settings() {
  const p = useProgress()
  const [confirmReset, setConfirmReset] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const disputed = questions.filter(isDisputed).length

  const setTheme = (theme: Theme) => {
    progress.updateSettings({ theme })
    applyTheme(theme)
  }

  const exportProgress = () => {
    const blob = new Blob([progress.export()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clf-c02-progress-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importProgress = (file: File) => {
    file.text().then((txt) => {
      const r = progress.import(txt)
      setMessage(r.ok ? 'Progress imported.' : r.error)
    })
  }

  return (
    <div className="space-y-10">
      <h1 className="text-[24px] font-bold">Settings</h1>

      <section>
        <h2 className="text-[17px] font-bold">Grade answers against</h2>
        <p className="mt-1 text-[14px] text-ink-2">
          {disputed} of {questions.length} questions have a community answer that differs from the official one.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Choice<GradeBy>
            name="grade"
            value="official"
            current={p.settings.gradeBy}
            onChange={(gradeBy) => progress.updateSettings({ gradeBy })}
            title="Official answer"
            detail="The answer printed in the question bank."
          />
          <Choice<GradeBy>
            name="grade"
            value="community"
            current={p.settings.gradeBy}
            onChange={(gradeBy) => progress.updateSettings({ gradeBy })}
            title="Community answer"
            detail="The most-voted answer, falling back to the official one when there are no votes."
          />
        </div>
      </section>

      <section>
        <h2 className="text-[17px] font-bold">Appearance</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Choice<Theme> name="theme" value="system" current={p.settings.theme} onChange={setTheme} title="Match system" />
          <Choice<Theme> name="theme" value="light" current={p.settings.theme} onChange={setTheme} title="Light" />
          <Choice<Theme> name="theme" value="dark" current={p.settings.theme} onChange={setTheme} title="Dark" />
        </div>
      </section>

      <section>
        <h2 className="text-[17px] font-bold">Your progress</h2>
        <p className="mt-1 text-[14px] text-ink-2">
          Saved in this browser only. Export a file to move it to another device.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={exportProgress}>Export progress</Button>
          <Button onClick={() => fileRef.current?.click()}>Import progress</Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importProgress(f)
              e.target.value = ''
            }}
          />
          {!confirmReset ? (
            <Button variant="danger" onClick={() => setConfirmReset(true)}>
              Reset progress
            </Button>
          ) : (
            <span className="flex items-center gap-2 text-[14px]">
              <span className="text-ink-2">This clears every answer, bookmark and exam result.</span>
              <Button
                variant="danger"
                onClick={() => {
                  progress.reset()
                  setConfirmReset(false)
                  setMessage('Progress cleared.')
                }}
              >
                Clear everything
              </Button>
              <Button variant="ghost" onClick={() => setConfirmReset(false)}>
                Keep it
              </Button>
            </span>
          )}
        </div>
        {message && (
          <p className="mt-3 text-[14px] text-ink-2" role="status">
            {message}
          </p>
        )}
      </section>

      <section>
        <h2 className="text-[17px] font-bold">Keyboard shortcuts</h2>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-[15px]">
          <dt className="text-ink-2">A–E or 1–5</dt>
          <dd>Pick an option</dd>
          <dt className="text-ink-2">Enter</dt>
          <dd>Check the answer, then go to the next question</dd>
          <dt className="text-ink-2">← →</dt>
          <dd>Previous / next question</dd>
          <dt className="text-ink-2">M</dt>
          <dd>Mark as bookmarked</dd>
          <dt className="text-ink-2">D</dt>
          <dd>Show or hide the discussion (after checking)</dd>
          <dt className="text-ink-2">R</dt>
          <dd>Try the question again (after checking)</dd>
        </dl>
      </section>
    </div>
  )
}
