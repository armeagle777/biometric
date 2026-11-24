import { useQuery } from '@tanstack/react-query'
import { bms } from '../api/bms'

export default function Dashboard() {
  const info = useQuery({ queryKey: ['bms-info'], queryFn: bms.info, retry: false })

  return (
    <section>
      <h2>BMS server status</h2>
      {info.isPending && <p>Checking…</p>}
      {info.isError && <p role="alert">Unavailable: {info.error.message}</p>}
      {info.data && (
        <p>
          {info.data.available ? 'Available' : 'Reported unavailable'}
          {info.data.details ? ` — ${info.data.details}` : ''}
          {info.data.errorDescription ? ` (${info.data.errorDescription})` : ''}
        </p>
      )}
      <button type="button" onClick={() => void info.refetch()} disabled={info.isFetching}>
        Recheck
      </button>
    </section>
  )
}
