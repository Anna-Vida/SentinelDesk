import { useEffect, useRef, type ReactNode } from 'react'
export function Modal({ title, eyebrow, onClose, busy = false, children }: {
  title: string; eyebrow?: string; onClose: () => void; busy?: boolean; children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current!
    const previous = document.activeElement as HTMLElement | null
    dialog.showModal()
    return () => { dialog.close(); previous?.focus() }
  }, [])
  return <dialog ref={ref} className="modal" aria-labelledby="modal-title" onCancel={event => { event.preventDefault(); if (!busy) onClose() }}>
    <div className="modal-head"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2 id="modal-title">{title}</h2></div>
      <button type="button" className="icon-button" disabled={busy} onClick={onClose} aria-label="Close dialog">×</button></div>
    {children}
  </dialog>
}
