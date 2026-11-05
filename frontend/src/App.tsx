import { Route, Routes } from 'react-router'
import Home from './pages/Home.tsx'
import RoleSelect from './pages/RoleSelect.tsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/app" element={<RoleSelect />} />
    </Routes>
  )
}

export default App
