import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import Login from '@/features/auth/Login'
import Dashboard from '@/features/dashboard/Dashboard'
import FlowEditor from '@/features/flows/editor/FlowEditor'
import RunFlow from '@/features/run/RunFlow'
import Onboarding from '@/features/secretary/Onboarding'
import ProtectedRoute from '@/components/ProtectedRoute'

export default function App() {
  const { user, initializing, initializeAuth } = useAuthStore()

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  if (initializing) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Carregando...</div>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/run/:flowId" element={<RunFlow />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/flows/:flowId/editor" element={<FlowEditor />} />
          <Route path="/secretary/new" element={<Onboarding />} />
        </Route>
        <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </Router>
  )
}
