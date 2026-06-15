import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useThemeStore } from '@/store/theme'
import { AppLayout } from '@/components/layout/AppLayout'

import Login from '@/pages/auth/Login'

import EmployeeDashboard from '@/pages/employee/Dashboard'
import CreateRequest from '@/pages/employee/CreateRequest'
import EmployeeRequestDetail from '@/pages/employee/RequestDetail'

import Display from '@/pages/Display'
import StaffDashboard from '@/pages/staff/Dashboard'
import StaffRequestDetail from '@/pages/staff/RequestDetail'

import AdminDashboard from '@/pages/admin/Dashboard'
import AdminUsers from '@/pages/admin/Users'
import AdminCategories from '@/pages/admin/Categories'
import AdminRequests from '@/pages/admin/Requests'

// Logged-in users can't access login page — redirect to their dashboard
function RequireGuest({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (user) return <Navigate to={`/${user.role}`} replace />
  return <>{children}</>
}

// Authenticated + correct role required
function RequireRole({ role, children }: { role: string; children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to={`/${user.role}`} replace />
  return <>{children}</>
}

export default function App() {
  const { init } = useAuthStore()
  const { init: initTheme } = useThemeStore()
  useEffect(() => { init(); initTheme() }, [init, initTheme])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<RequireGuest><Login /></RequireGuest>} />
        <Route path="/display" element={<Display />} />

        <Route element={<AppLayout />}>
          <Route path="/employee" element={<RequireRole role="employee"><EmployeeDashboard /></RequireRole>} />
          <Route path="/employee/new" element={<RequireRole role="employee"><CreateRequest /></RequireRole>} />
          <Route path="/employee/requests/:id" element={<RequireRole role="employee"><EmployeeRequestDetail /></RequireRole>} />

          <Route path="/staff" element={<RequireRole role="staff"><StaffDashboard /></RequireRole>} />
          <Route path="/staff/:id" element={<RequireRole role="staff"><StaffRequestDetail /></RequireRole>} />

          <Route path="/admin" element={<RequireRole role="admin"><AdminDashboard /></RequireRole>} />
          <Route path="/admin/users" element={<RequireRole role="admin"><AdminUsers /></RequireRole>} />
          <Route path="/admin/categories" element={<RequireRole role="admin"><AdminCategories /></RequireRole>} />
          <Route path="/admin/requests" element={<RequireRole role="admin"><AdminRequests /></RequireRole>} />
          <Route path="/admin/my-requests" element={<RequireRole role="admin"><EmployeeDashboard /></RequireRole>} />
          <Route path="/admin/my-requests/new" element={<RequireRole role="admin"><CreateRequest /></RequireRole>} />
          <Route path="/admin/my-requests/:id" element={<RequireRole role="admin"><EmployeeRequestDetail /></RequireRole>} />
        </Route>

        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  )
}

function RootRedirect() {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={`/${user.role}`} replace />
}
