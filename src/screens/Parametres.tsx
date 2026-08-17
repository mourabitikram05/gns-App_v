import { useState, type FormEvent } from 'react'
import { KeyRound, Loader2, User, Bell, ShieldCheck, Check } from 'lucide-react'
import { authApi } from '../api/modules'
import { useToasts } from '../components/ui'
import { useAuth } from '../context/AuthContext'

export default function Parametres() {
  const { user } = useAuth()
  const { success, error: toastError } = useToasts()
  const [form, setForm] = useState({ ancien: '', nouveau: '', confirmation: '' })
  const [saving, setSaving] = useState(false)
  const [notifs, setNotifs] = useState<Record<string, boolean>>(() => ({
    conges: localStorage.getItem('gns_pref_conges') !== 'off',
    frais: localStorage.getItem('gns_pref_frais') !== 'off',
    evenements: localStorage.getItem('gns_pref_evenements') !== 'off',
    documents: localStorage.getItem('gns_pref_documents') !== 'off',
  }))

  const toggleNotif = (key: string) => {
    setNotifs((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem(`gns_pref_${key}`, next[key] ? 'on' : 'off')
      return next
    })
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (form.nouveau.length < 6) {
      toastError('Le nouveau mot de passe doit contenir au moins 6 caractères')
      return
    }
    if (form.nouveau !== form.confirmation) {
      toastError('La confirmation ne correspond pas au nouveau mot de passe')
      return
    }
    setSaving(true)
    try {
      await authApi.changePassword(form.ancien, form.nouveau)
      success('Mot de passe modifié avec succès')
      setForm({ ancien: '', nouveau: '', confirmation: '' })
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const NOTIF_ITEMS = [
    { key: 'conges', label: 'Congés & absences', desc: 'Validations, refus et changements de statut' },
    { key: 'frais', label: 'Notes de frais', desc: 'Suivi de vos remboursements' },
    { key: 'evenements', label: 'Événements', desc: 'Nouveaux événements et rappels' },
    { key: 'documents', label: 'Documents', desc: 'Documents disponibles et traités' },
  ]

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-sm text-gray-500 mt-0.5">Sécurité et préférences de votre compte</p>
      </div>

      {/* Compte */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><User size={15} style={{ color: '#C9A227' }} /> Compte</h3>
        </div>
        <div className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: '#C9A227' }}>
            {(user?.nomComplet || user?.email || 'U').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">{user?.nomComplet ?? '—'}</div>
            <div className="text-xs text-gray-500">{user?.email}</div>
          </div>
          <span className="ml-auto text-xs font-semibold px-3 py-1 rounded-full" style={{ background: '#D1FAE5', color: '#065F46' }}>
            <ShieldCheck size={11} className="inline mr-1" />Compte actif
          </span>
        </div>
      </div>

      {/* Mot de passe */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><KeyRound size={15} style={{ color: '#C9A227' }} /> Changer le mot de passe</h3>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Mot de passe actuel *</label>
            <input type="password" required value={form.ancien}
              onChange={(e) => setForm((f) => ({ ...f, ancien: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nouveau mot de passe *</label>
              <input type="password" required value={form.nouveau}
                onChange={(e) => setForm((f) => ({ ...f, nouveau: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Confirmation *</label>
              <input type="password" required value={form.confirmation}
                onChange={(e) => setForm((f) => ({ ...f, confirmation: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            style={{ background: '#0F1E3D' }}>
            {saving && <Loader2 size={13} className="animate-spin" />} Enregistrer
          </button>
        </form>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Bell size={15} style={{ color: '#C9A227' }} /> Notifications</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {NOTIF_ITEMS.map((n) => (
            <div key={n.key} className="flex items-center gap-4 px-6 py-3.5">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">{n.label}</div>
                <div className="text-xs text-gray-500">{n.desc}</div>
              </div>
              <button
                onClick={() => toggleNotif(n.key)}
                className="w-10 h-6 rounded-full transition-colors relative flex-shrink-0"
                style={{ background: notifs[n.key] ? '#10B981' : '#D1D5DB' }}
                aria-pressed={notifs[n.key]}
              >
                <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                  style={{ left: notifs[n.key] ? 18 : 2 }} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
