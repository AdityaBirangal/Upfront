import { useQuery } from '@tanstack/react-query'
import { BACKEND_URL } from '../backend.ts'

const CHECK_EVERY_MS = 30_000
// Long enough for a Cloud Functions cold start, which boots Nest first.
const TIMEOUT_MS = 15_000

async function fetchHealth() {
  const response = await fetch(`${BACKEND_URL}/health`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`Health check failed: ${response.status}`)
  const health: { ok?: boolean } = await response.json()
  if (health.ok !== true) throw new Error('Backend reports it is not healthy')
  return health
}

function BackendStatus() {
  const health = useQuery({
    queryKey: ['backend-health'],
    queryFn: fetchHealth,
    enabled: Boolean(BACKEND_URL),
    refetchInterval: CHECK_EVERY_MS,
    retry: false,
  })

  const label = !BACKEND_URL
    ? 'not configured'
    : health.isPending
      ? 'checking…'
      : health.isSuccess
        ? 'online'
        : 'offline'

  return <span className="backend-status">Backend: {label}</span>
}

export default BackendStatus
