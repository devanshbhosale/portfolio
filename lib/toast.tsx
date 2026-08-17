'use client'
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, XCircle, X } from 'lucide-react'

type ToastType = 'success' | 'error'
interface Toast { id: number; message: string; type: ToastType }

const ToastContext = createContext<{ toast: (message: string, type?: ToastType) => void } | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = nextId.current++
    setToasts((prev) => [...prev.slice(-3), { id, message, type }])
    setTimeout(() => dismiss(id), 4000)
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div aria-live="polite" className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-xs">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="flex items-start gap-2 rounded-lg bg-gray-900 px-4 py-3 text-sm text-white shadow-lg"
          >
            {t.type === 'success'
              ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-green-400" aria-hidden />
              : <XCircle size={16} className="mt-0.5 shrink-0 text-red-400" aria-hidden />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="text-gray-400 hover:text-white" aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
