import { useCallback, useEffect, useState } from 'react'
import {
  Users, UserPlus, TrendingDown, Heart, Clock, AlertCircle,
  Briefcase, GraduationCap, Check, X, ArrowUpRight, ArrowDownRight, Download, FileText,
  Sun, Plus, Loader2, Pencil, Trash2
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { congesApi, dashboardApi, fraisApi, pointageApi, reportingApi, sondageApi } from '../api/modules'
import type { AbsenceMensuelle, ActionAttente, ActiviteItem, DeptCount, KpiCard, SondageDuJour } from '../api/types'
import { ErrorBlock, Spinner, useToasts } from '../components/ui'

const KPI_STYLES: Record<string, { icon: typeof Users; color: string }> = {
  effectif: { icon: Users, color: '#0F1E3D' },
  recrutements: { icon: UserPlus, color: '#C9A227' },
  absenteisme: { icon: TrendingDown, color: '#EF4444' },
  engagement: { icon: Heart, color: '#10B981' },
  conges_attente: { icon: Clock, color: '#F59E0B' },
  absences_jour: { icon: AlertCircle, color: '#EF4444' },
  postes_ouverts: { icon: Briefcase, color: '#0F1E3D' },
  formations: { icon: GraduationCap, color: '#C9A227' },
}

const DEPT_COLORS = ['#0F1E3D', '#C9A227', '#10B981', '#F59E0B', '#6366F1', '#14B8A6', '#8B5CF6', '#EF4444']

export default function DashboardRH() {
  const { success, error: toastError } = useToasts()

  const [kpis, setKpis] = useState<KpiCard[]>([])
  const [absences, setAbsences] = useState<AbsenceMensuelle[]>([])
  const [depts, setDepts] = useState<DeptCount[]>([])
  const [actions, setActions] = useState<ActionAttente[]>([])
  const [activite, setActivite] = useState<ActiviteItem[]>([])
  const [enPoste, setEnPoste] = useState(0)
  const [sondages, setSondages] = useState<SondageDuJour[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [acting, setActing] = useState<number | null>(null)
  // Formulaire sondage
  const [sondageForm, setSondageForm] = useState({ question: '', options: ['', ''] })
  const [editingSondage, setEditingSondage] = useState<number | null>(null)
  const [sondageSaving, setSondageSaving] = useState(false)

  const todayStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  // Compteur "en poste" : polling léger (30 s) — reflète les pointages collaborateur
  useEffect(() => {
    const fetchEnPoste = () => {
      pointageApi.enPoste().then(setEnPoste).catch(() => {})
    }
    fetchEnPoste()
    const timer = setInterval(fetchEnPoste, 30000)
    return () => clearInterval(timer)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [k, a, d, act, av, sd] = await Promise.all([
        dashboardApi.kpis(),
        dashboardApi.absencesMensuelles(),
        dashboardApi.effectifsDepartement(),
        dashboardApi.actionsAttente(),
        dashboardApi.activiteRecent(),
        sondageApi.lister(),
      ])
      setKpis(k)
      setAbsences(a)
      setDepts(d)
      setActions(act)
      setActivite(av)
      setSondages(sd)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement du dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleAction = async (action: ActionAttente, decision: 'valider' | 'refuser') => {
    setActing(action.demandeId)
    try {
      const isFrais = action.module === 'FRAIS'
      if (decision === 'valider') {
        if (isFrais) await fraisApi.valider(action.demandeId)
        else await congesApi.valider(action.demandeId)
        success(`${isFrais ? 'Note de frais' : 'Demande'} de ${action.name} validée`)
      } else {
        const motif = window.prompt(`Motif du refus pour ${action.name} (obligatoire) :`)
        if (!motif) { setActing(null); return }
        if (isFrais) await fraisApi.refuser(action.demandeId, motif)
        else await congesApi.refuser(action.demandeId, motif)
        success(`${isFrais ? 'Note de frais' : 'Demande'} de ${action.name} refusée`)
      }
      load()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setActing(null)
    }
  }

  const submitSondage = async () => {
    const options = sondageForm.options.map((o) => o.trim()).filter(Boolean)
    if (!sondageForm.question.trim()) { toastError('La question est obligatoire'); return }
    if (options.length < 2) { toastError('Au moins deux options sont requises'); return }
    setSondageSaving(true)
    try {
      const body = { question: sondageForm.question.trim(), options }
      if (editingSondage) {
        await sondageApi.modifier(editingSondage, body)
        success('Sondage modifié')
      } else {
        await sondageApi.creer(body)
        success('Sondage publié — visible par les collaborateurs')
      }
      setSondageForm({ question: '', options: ['', ''] })
      setEditingSondage(null)
      setSondages(await sondageApi.lister())
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSondageSaving(false)
    }
  }

  const editerSondage = (s: SondageDuJour) => {
    setEditingSondage(s.id)
    setSondageForm({ question: s.question, options: s.options.length >= 2 ? [...s.options] : ['', ''] })
  }

  const setOption = (i: number, v: string) =>
    setSondageForm((f) => ({ ...f, options: f.options.map((o, j) => (j === i ? v : o)) }))

  const addOption = () => setSondageForm((f) => ({ ...f, options: [...f.options, ''] }))
  const removeOption = (i: number) =>
    setSondageForm((f) => ({ ...f, options: f.options.filter((_, j) => j !== i) }))

  const sondageActif = sondages[0] ?? null

  if (loading) {
    return (
      <div className="p-6">
        <Spinner label="Chargement du dashboard RH..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorBlock message={error} onRetry={load} />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard RH</h1>
          <p className="text-sm text-gray-500 mt-0.5 capitalize">{todayStr}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => reportingApi.rapportCsv('Export du dashboard').then(() => success('Export CSV téléchargé')).catch((e) => toastError(e.message))}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-center gap-1.5">
            <Download size={14} /> Exporter
          </button>
          <button
            onClick={() => reportingApi.rapportMensuel().then(() => success('Rapport mensuel téléchargé')).catch((e) => toastError(e.message))}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors hover:opacity-90 flex items-center gap-1.5"
            style={{ background: '#0F1E3D' }}>
            <FileText size={14} /> Rapport mensuel
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const style = KPI_STYLES[kpi.key] ?? { icon: Users, color: '#0F1E3D' }
          const Icon = style.icon
          return (
            <div key={kpi.key} className="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: style.color + '15' }}>
                  <Icon size={18} style={{ color: style.color }} />
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${kpi.up ? 'text-emerald-600' : 'text-red-500'}`}>
                  {kpi.up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  {kpi.change}
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{kpi.label}</div>
              {kpi.key === 'effectif' && (
                <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: enPoste > 0 ? '#D1FAE5' : '#F3F4F6', color: enPoste > 0 ? '#065F46' : '#6B7280' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: enPoste > 0 ? '#10B981' : '#9CA3AF' }} />
                  {enPoste} en poste maintenant
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Sondage du jour — gestion RH */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Sun size={15} style={{ color: '#C9A227' }} /> Sondage du jour</h3>
            {sondageActif && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#92400E' }}>
                {sondageActif.totalReponses} réponse(s)
              </span>
            )}
          </div>
          <div className="p-5">
            {!sondageActif ? (
              <div className="text-sm text-gray-500 py-6 text-center">Aucun sondage publié — créez la question du jour.</div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-900">{sondageActif.question}</div>
                <div className="text-[11px] text-gray-400">Publié le {new Date(sondageActif.date + 'T00:00:00').toLocaleDateString('fr-FR')}</div>
                {sondageActif.options.map((opt) => {
                  const count = sondageActif.reponsesParOption[opt] ?? 0
                  const pct = sondageActif.totalReponses > 0 ? Math.round((count / sondageActif.totalReponses) * 100) : 0
                  return (
                    <div key={opt} className="relative overflow-hidden rounded-lg px-3 py-2 border border-gray-100" style={{ background: '#F7F8FA' }}>
                      <div className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, background: '#C9A22733' }} />
                      <div className="relative flex items-center justify-between text-xs">
                        <span className="font-medium text-gray-800">{opt}</span>
                        <span className="font-semibold text-gray-600">{count} · {pct}%</span>
                      </div>
                    </div>
                  )
                })}
                <button onClick={() => editerSondage(sondageActif)}
                  className="flex items-center gap-1.5 text-xs font-semibold hover:underline" style={{ color: '#C9A227' }}>
                  <Pencil size={11} /> Modifier le sondage
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Plus size={15} style={{ color: '#C9A227' }} /> {editingSondage ? 'Modifier le sondage' : 'Créer la question du jour'}
            </h3>
          </div>
          <div className="p-5 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Question *</label>
              <input value={sondageForm.question}
                onChange={(e) => setSondageForm((f) => ({ ...f, question: e.target.value }))}
                placeholder="Ex. Comment évaluez-vous votre journée ?"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
            </div>
            {sondageForm.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={opt}
                  onChange={(e) => setOption(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
                {sondageForm.options.length > 2 && (
                  <button onClick={() => removeOption(i)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50"
                    style={{ color: '#EF4444' }}><Trash2 size={13} /></button>
                )}
              </div>
            ))}
            <button onClick={addOption} className="text-xs font-semibold hover:underline flex items-center gap-1" style={{ color: '#C9A227' }}>
              <Plus size={12} /> Ajouter une option
            </button>
            <div className="flex gap-2 pt-1">
              {editingSondage && (
                <button onClick={() => { setEditingSondage(null); setSondageForm({ question: '', options: ['', ''] }) }}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50">
                  Annuler
                </button>
              )}
              <button onClick={submitSondage} disabled={sondageSaving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                style={{ background: '#0F1E3D' }}>
                {sondageSaving && <Loader2 size={13} className="animate-spin" />}
                {editingSondage ? 'Enregistrer les modifications' : 'Publier le sondage'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Charts row */}
      {/* <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white rounded-xl p-5 border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Jours d'absence par mois</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={absences} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="mois" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} />
              <Bar dataKey="jours" fill="#0F1E3D" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Effectifs par département</h3>
          {depts.length === 0 ? (
            <div className="text-center py-16 text-sm" style={{ color: '#9CA3AF' }}>Aucune donnée</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={depts} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                  {depts.map((_, i) => <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} />
                <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div> */}

      {/* Bottom row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Actions en attente */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Actions en attente</h3>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#92400E' }}>
              {actions.length} en attente
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {actions.length === 0 && (
              <div className="px-5 py-10 text-center text-sm" style={{ color: '#9CA3AF' }}>Aucune action en attente</div>
            )}
            {actions.map((action) => (
              <div key={action.demandeId} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: '#0F1E3D' }}>
                  {action.initiales}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{action.name}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {action.type} · {action.module === 'FRAIS'
                      ? `${action.detail} · ${action.montant.toLocaleString('fr-FR')} MAD`
                      : `${action.detail} · ${action.nombreJours} j`}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleAction(action, 'valider')}
                    disabled={acting === action.demandeId}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-emerald-50 disabled:opacity-50"
                    style={{ color: '#10B981', border: '1px solid #D1FAE5' }}>
                    <Check size={13} />
                  </button>
                  <button
                    onClick={() => handleAction(action, 'refuser')}
                    disabled={acting === action.demandeId}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-red-50 disabled:opacity-50"
                    style={{ color: '#EF4444', border: '1px solid #FEE2E2' }}>
                    <X size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activité récente */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Activité récente</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {activite.length === 0 && (
              <div className="px-5 py-10 text-center text-sm" style={{ color: '#9CA3AF' }}>Aucune activité</div>
            )}
            {activite.map((act, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3">
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: act.dot }} />
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{act.text}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{act.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
