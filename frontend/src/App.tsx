import { useState } from 'react'
import { Route, Routes } from 'react-router'
import AdminRoles from './pages/AdminRoles.tsx'
import Buyer from './pages/Buyer.tsx'
import Home from './pages/Home.tsx'
import Invest from './pages/Invest.tsx'
import RoleSelect from './pages/RoleSelect.tsx'
import Seller from './pages/Seller.tsx'
import type { Holding, Receivable } from './receivables.ts'
import type { Assignment } from './roles.ts'

function App() {
  // Client-side only for now: a refresh clears these. Moves to a smart contract later.
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [receivables, setReceivables] = useState<Receivable[]>([])
  const [holdings, setHoldings] = useState<Holding[]>([])

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
      <Route
        path="/app/seller"
        element={
          <Seller
            assignments={assignments}
            receivables={receivables}
            onChange={setReceivables}
          />
        }
      />
      <Route
        path="/app/buyer"
        element={
          <Buyer receivables={receivables} onChange={setReceivables} />
        }
      />
      <Route
        path="/app/invest"
        element={
          <Invest
            assignments={assignments}
            receivables={receivables}
            holdings={holdings}
            onReceivablesChange={setReceivables}
            onHoldingsChange={setHoldings}
          />
        }
      />
    </Routes>
  )
}

export default App
