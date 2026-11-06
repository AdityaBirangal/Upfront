import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

// The landing page is built later (V6). Until then, one way into the app.
function Home() {
  return (
    <main className="grid min-h-svh place-items-center p-4">
      <Button size="lg" asChild>
        <Link to="/app">Go to app</Link>
      </Button>
    </main>
  )
}

export default Home
