import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { applyTheme, useProgress } from './lib/store'
import Browse from './pages/Browse'
import { ExamResultPage, ExamRun, ExamSetup } from './pages/Exam'
import Home from './pages/Home'
import Practice, { PracticeEntry } from './pages/Practice'
import Settings from './pages/Settings'

export default function App() {
  const theme = useProgress().settings.theme

  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="practice" element={<PracticeEntry />} />
          <Route path="practice/:id" element={<Practice />} />
          <Route path="browse" element={<Browse />} />
          <Route path="exam" element={<ExamSetup />} />
          <Route path="exam/run" element={<ExamRun />} />
          <Route path="exam/result/:id" element={<ExamResultPage />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
