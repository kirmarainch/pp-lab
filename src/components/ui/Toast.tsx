import { useLabStore } from '../../lib/store'

export function Toast() {
  const toast = useLabStore((state) => state.toast)

  if (!toast) return null

  return (
    <div className="toast" role="status" aria-live="polite" key={toast.id}>
      {toast.text}
    </div>
  )
}
