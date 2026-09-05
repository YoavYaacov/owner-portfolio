import { HashRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import PublicOnlyRoute from './components/PublicOnlyRoute'
import RootRedirect from './components/RootRedirect'
import LoginPage from './pages/LoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DashboardPage from './pages/DashboardPage'

// HashRouter is the deliberate default for GitHub Pages static hosting
// (Master Prompt §8 / ADR-018) — it needs no server-side rewrite rules.
export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>

          {/* Reset-password is reachable whether or not a session already
              exists (the recovery link itself creates a temporary session),
              so it intentionally sits outside both guards — see ADR-018. */}
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>

          <Route path="/" element={<RootRedirect />} />
          {/* Also catches the case where Supabase's recovery link appended
              its tokens in a way that doesn't parse as "/reset-password"
              (ADR-018) — RootRedirect itself checks recoveryPending. */}
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
