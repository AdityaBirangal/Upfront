import { useState } from 'react'
import { Route, Routes } from 'react-router'
import RequireRole from './components/RequireRole.tsx'
import WalletBar from './components/WalletBar.tsx'
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
    <div className="app-shell">
      <WalletBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/app" element={<RoleSelect />} />
        {/* Open to every wallet for now, so anyone can assign the first roles. */}
        <Route
          path="/app/admin"
          element={
            <AdminRoles assignments={assignments} onChange={setAssignments} />
          }
        />
        <Route
          path="/app/seller"
          element={
            <RequireRole role="Seller" assignments={assignments}>
              {() => (
                <Seller
                  assignments={assignments}
                  receivables={receivables}
                  onChange={setReceivables}
                />
              )}
            </RequireRole>
          }
        />
        <Route
          path="/app/buyer"
          element={
            <RequireRole role="Buyer" assignments={assignments}>
              {() => (
                <Buyer receivables={receivables} onChange={setReceivables} />
              )}
            </RequireRole>
          }
        />
        <Route
          path="/app/invest"
          element={
            <RequireRole role="Investor" assignments={assignments}>
              {(wallet) => (
                <Invest
                  wallet={wallet}
                  receivables={receivables}
                  holdings={holdings}
                  onReceivablesChange={setReceivables}
                  onHoldingsChange={setHoldings}
                />
              )}
            </RequireRole>
          }
        />
      </Routes>
    </div>
  )
}

export default App
