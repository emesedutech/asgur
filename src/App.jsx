import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import Layout        from './components/layout/Layout.jsx'
import LoginPage     from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import StudentsPage  from './pages/StudentsPage.jsx'
import AttendancePage from './pages/AttendancePage.jsx'
import GradesPage    from './pages/GradesPage.jsx'
import BehaviorPage  from './pages/BehaviorPage.jsx'
import SchedulePage  from './pages/SchedulePage.jsx'
import PrintPage     from './pages/PrintPage.jsx'
import SettingsPage  from './pages/SettingsPage.jsx'

function AppContent() {
  const { user, loading } = useAuth()
  const [page, setPage] = useState('dashboard')

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-600 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🎓</div>
          <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-white/70 text-sm mt-3 font-medium">Memuat...</p>
        </div>
      </div>
    )
  }

  if (!user) return <LoginPage />

  const pages = {
    dashboard:  <DashboardPage setPage={setPage} />,
    students:   <StudentsPage />,
    attendance: <AttendancePage />,
    grades:     <GradesPage />,
    behavior:   <BehaviorPage />,
    schedule:   <SchedulePage />,
    print:      <PrintPage />,
    settings:   <SettingsPage />,
  }

  return (
    <Layout page={page} setPage={setPage}>
      {pages[page] || pages.dashboard}
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
