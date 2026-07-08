import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

type ToastKind = 'ok' | 'err'
interface Toast {
  id: number
  kind: ToastKind
  message: string
}
interface ToastCtx {
  notify: (message: string, kind?: ToastKind) => void
}

const Ctx = createContext<ToastCtx | null>(null)

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const notify = useCallback((message: string, kind: ToastKind = 'ok') => {
    const id = nextId++
    setToasts((t) => [...t, { id, kind, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600)
  }, [])

  return (
    <Ctx.Provider value={{ notify }}>
      {children}
      <div className="toasts" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDone={() => remove(t.id)} />
        ))}
      </div>
    </Ctx.Provider>
  )
}

function ToastItem({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  useEffect(() => {
    // no-op; auto-dismiss handled by provider timeout
  }, [])
  return (
    <div className={'toast' + (toast.kind === 'err' ? ' err' : '')} role="status">
      <span className="toast-mark">{toast.kind === 'err' ? '✕' : '✓'}</span>
      <span>{toast.message}</span>
      <button
        aria-label="Dismiss"
        onClick={onDone}
        style={{
          marginLeft: 'auto',
          background: 'none',
          border: 0,
          color: 'inherit',
          cursor: 'pointer',
          opacity: 0.6,
        }}
      >
        ✕
      </button>
    </div>
  )
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
