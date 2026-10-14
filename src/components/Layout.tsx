import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { TOTAL } from '../lib/data'
import { useProgress } from '../lib/store'

const nav = [
  { to: '/', label: 'Overview', end: true },
  { to: '/practice', label: 'Practice' },
  { to: '/browse', label: 'Browse' },
  { to: '/exam', label: 'Exam' },
  { to: '/settings', label: 'Settings' },
]

export default function Layout() {
  const { answers } = useProgress()
  const answered = Object.keys(answers).length
  const loc = useLocation()
  const inExam = loc.pathname.startsWith('/exam/run')

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 h-14">
          <NavLink to="/" className="flex shrink-0 items-center gap-2 whitespace-nowrap font-bold text-[17px] tracking-tight">
            <span className="inline-block h-3 w-3 rounded-sm bg-accent" aria-hidden />
            CLF-C02
          </NavLink>
          <span className="hidden sm:inline text-[14px] text-muted">
            {answered}/{TOTAL} answered
          </span>
          {!inExam && (
            <nav className="ml-auto flex gap-0.5 overflow-x-auto">
              {nav.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    `rounded-md px-2.5 h-8 inline-flex items-center text-[15px] whitespace-nowrap ${
                      isActive ? 'bg-surface-2 text-ink font-semibold' : 'text-ink-2 hover:text-ink'
                    }`
                  }
                >
                  {n.label}
                </NavLink>
              ))}
            </nav>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
