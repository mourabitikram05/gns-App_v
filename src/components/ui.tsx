import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

/* ------------------------------------------------------------------ */
/* Toasts                                                              */
/* ------------------------------------------------------------------ */

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}

interface ToastContextValue {
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((message: string, type: 'success' | 'error') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  const success = useCallback((message: string) => push(message, 'success'), [push])
  const error = useCallback((message: string) => push(message, 'error'), [push])

  return (
    <ToastContext.Provider value={{ success, error }}>
      {children}
      <div className="fixed top-5 right-5 z-[100] space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium text-white animate-[fadeIn_0.2s_ease]"
            style={{ background: t.type === 'success' ? '#0F1E3D' : '#B91C1C', minWidth: 260, maxWidth: 380 }}
          >
            {t.type === 'success' ? <CheckCircle2 size={16} style={{ color: '#C9A227' }} /> : <AlertCircle size={16} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToasts() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToasts doit être utilisé dans <ToastProvider>')
  return ctx
}

/* ------------------------------------------------------------------ */
/* Spinner / skeleton                                                  */
/* ------------------------------------------------------------------ */

export function Spinner({ label = 'Chargement...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-2">
      <Loader2 size={22} className="animate-spin" style={{ color: '#0F1E3D' }} />
      <span className="text-xs" style={{ color: '#9CA3AF' }}>{label}</span>
    </div>
  )
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border p-6 text-center" style={{ borderColor: '#FECACA', background: '#FEF2F2' }}>
      <AlertCircle size={20} className="mx-auto mb-2" style={{ color: '#B91C1C' }} />
      <p className="text-sm font-medium mb-2" style={{ color: '#991B1B' }}>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors"
          style={{ borderColor: '#FECACA', color: '#991B1B', background: '#fff' }}
        >
          Réessayer
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export const AVATAR_COLORS = ['#0F1E3D', '#C9A227', '#10B981', '#EF4444', '#8B5CF6', '#F59E0B', '#3B82F6', '#14B8A6']

/** Couleur d'avatar déterministe à partir d'un id (stable entre rendus). */
export function avatarColor(id: number): string {
  return AVATAR_COLORS[Math.abs(id) % AVATAR_COLORS.length]
}

export function initialsOf(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

export const MONTHS_FR_COURT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

/** Jours ouvrés (lun-ven) entre deux dates incluses. */
export function workingDays(debut: string, fin: string): number {
  const start = new Date(debut + 'T00:00:00')
  const end = new Date(fin + 'T00:00:00')
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0
  let count = 0
  const cursor = new Date(start)
  while (cursor <= end) {
    const dow = cursor.getDay()
    if (dow !== 0 && dow !== 6) count++
    cursor.setDate(cursor.getDate() + 1)
  }
  return count
}

export const STATUS_BADGES: Record<string, { bg: string; color: string; label: string }> = {
  EN_ATTENTE: { bg: '#FEF3C7', color: '#92400E', label: 'En attente' },
  APPROUVEE: { bg: '#D1FAE5', color: '#065F46', label: 'Approuvée' },
  REFUSEE: { bg: '#FEE2E2', color: '#991B1B', label: 'Refusée' },
  ANNULEE: { bg: '#F3F4F6', color: '#4B5563', label: 'Annulée' },
}
