import { Link } from 'react-router'

function Home() {
  return (
    <main className="page">
      <Link to="/app" className="button">
        Go to app
      </Link>
    </main>
  )
}

export default Home
