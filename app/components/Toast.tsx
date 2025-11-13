import { useEffect } from 'react'

export default function Toast({ message, show, onClose }: { message: string; show: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!show) return
    const t = setTimeout(() => onClose(), 3000)
    return () => clearTimeout(t)
  }, [show, onClose])

  if (!show) return null

  return (
    <div className="fixed right-4 bottom-6 z-50">
      <div className="bg-black/85 text-white px-4 py-2 rounded shadow">{message}</div>
    </div>
  )
}
