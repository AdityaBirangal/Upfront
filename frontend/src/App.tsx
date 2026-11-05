import { Route, Routes } from 'react-router'
import RequireRole from './components/RequireRole.tsx'
import WalletBar from './components/WalletBar.tsx'
import AdminRoles from './pages/AdminRoles.tsx'
import Buyer from './pages/Buyer.tsx'
import Home from './pages/Home.tsx'
import Invest from './pages/Invest.tsx'
import ReceivableDetail from './pages/ReceivableDetail.tsx'
import RoleSelect from './pages/RoleSelect.tsx'
import Seller from './pages/Seller.tsx'

function App() {
  return (
    <div className="app-shell">
      <WalletBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/app" element={<RoleSelect />} />
        {/* Anyone can view roles. Only admin wallets can change them. */}
        <Route path="/app/admin" element={<AdminRoles />} />
        <Route
          path="/app/seller"
          element={
            <RequireRole role="Seller">
              {(wallet) => <Seller wallet={wallet} />}
            </RequireRole>
          }
        />
        <Route
          path="/app/buyer"
          element={
            <RequireRole role="Buyer">
              {(wallet) => <Buyer wallet={wallet} />}
            </RequireRole>
          }
        />
        <Route
          path="/app/invest"
          element={
            <RequireRole role="Investor">
              {(wallet) => <Invest wallet={wallet} />}
            </RequireRole>
          }
        />
        <Route path="/app/receivable/:id" element={<ReceivableDetail />} />
      </Routes>
    </div>
  )
}

export default App
