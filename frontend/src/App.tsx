import { useState } from 'react'
import { Route, Routes } from 'react-router'
import AdminRoles from './pages/AdminRoles.tsx'
import Home from './pages/Home.tsx'
import RoleSelect from './pages/RoleSelect.tsx'
import type { Assignment } from './roles.ts'

function App() {
  // Client-side only for now: a refresh clears this. Moves to a smart contract later.
  const [assignments, setAssignments] = useState<Assignment[]>([])

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/app" element={<RoleSelect />} />
      <Route
        path="/app/admin"
        element={
          <AdminRoles assignments={assignments} onChange={setAssignments} />
        }
      />
    </Routes>
  )
}

export default App
