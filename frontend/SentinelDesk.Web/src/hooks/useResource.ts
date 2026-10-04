import { useCallback, useEffect, useState } from 'react'
// Each effect owns its response. Older requests cannot replace a newer filter or live refresh.
export function useResource<T>(load: () => Promise<T>, revision = 0) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt(value => value + 1), [])
  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    void load().then(result => { if (active) setData(result) })
      .catch(error => { if (active) setError(error instanceof Error ? error.message : 'Request failed') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [load, revision, attempt])
  return { data, error, loading, retry }
}
