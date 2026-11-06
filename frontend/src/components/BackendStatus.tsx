import { useQuery } from '@tanstack/react-query'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { BACKEND_URL } from '@/backend.ts'
import { cn } from '@/lib/utils'

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

/** Whether the document service answers /health. Documents can't upload or open without it. */
function BackendStatus({ className }: { className?: string }) {
  const health = useQuery({
    queryKey: ['backend-health'],
    queryFn: fetchHealth,
    enabled: Boolean(BACKEND_URL),
    refetchInterval: CHECK_EVERY_MS,
    retry: false,
  })

  const state = !BACKEND_URL
    ? 'not configured'
    : health.isPending
      ? 'checking'
      : health.isSuccess
        ? 'online'
        : 'offline'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'text-muted-foreground inline-flex h-8 items-center gap-2 rounded-md px-2 text-xs',
            className,
          )}
          tabIndex={0}
        >
          <span
            className={cn(
              'size-2 rounded-full',
              state === 'online' && 'bg-state-settled',
              state === 'offline' && 'bg-state-defaulted',
              state === 'checking' && 'bg-warning animate-pulse',
              state === 'not configured' && 'bg-state-closed',
            )}
            aria-hidden
          />
          Documents {state}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {state === 'online'
          ? 'The document service is up. Agreements can be uploaded and opened.'
          : state === 'not configured'
            ? 'VITE_BACKEND_URL is not set, so documents are unavailable.'
            : state === 'checking'
              ? 'Checking the document service…'
              : "The document service isn't answering. Uploads and PDF links won't work."}
      </TooltipContent>
    </Tooltip>
  )
}

export default BackendStatus
