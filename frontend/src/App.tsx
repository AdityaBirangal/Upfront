import { Route, Routes } from 'react-router'
import RequireRole from './components/RequireRole.tsx'
import AppShell from './components/layout/AppShell.tsx'
import AdminRoles from './pages/AdminRoles.tsx'
import Buyer from './pages/Buyer.tsx'
import FutureScope from './pages/FutureScope.tsx'
import Home from './pages/Home.tsx'
import Invest from './pages/Invest.tsx'
import Overview from './pages/Overview.tsx'
import ReceivableDetail from './pages/ReceivableDetail.tsx'
import Seller from './pages/Seller.tsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/future" element={<FutureScope />} />
      <Route path="/app" element={<AppShell />}>
        <Route index element={<Overview />} />
        {/* Anyone can view roles. Only admin wallets can change them. */}
        <Route path="admin" element={<AdminRoles />} />
        <Route
          path="seller"
          element={<RequireRole role="Seller">{(wallet) => <Seller wallet={wallet} />}</RequireRole>}
        />
        <Route
          path="buyer"
          element={<RequireRole role="Buyer">{(wallet) => <Buyer wallet={wallet} />}</RequireRole>}
        />
        <Route
          path="invest"
          element={<RequireRole role="Investor">{(wallet) => <Invest wallet={wallet} />}</RequireRole>}
        />
        <Route path="receivable/:id" element={<ReceivableDetail />} />
      </Route>
    </Routes>
  )
}

export default App
