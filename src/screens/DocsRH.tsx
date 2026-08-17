import { useCallback, useEffect, useState } from 'react'
import { Search, Check, X, Loader2, Download } from 'lucide-react'
import { documentsApi } from '../api/modules'
import type { DemandeDocument, StatsDocuments } from '../api/types'
import { ErrorBlock, fmtDate, Spinner, useToasts } from '../components/ui'

const STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
  EN_TRAITEMENT: { bg: '#FEF3C7', color: '#92400E', label: 'À traiter' },
  DISPONIBLE: { bg: '#D1FAE5', color: '#065F46', label: 'Traité' },
  REFUSE: { bg: '#FEE2E2', color: '#991B1B', label: 'Refusé' },
}

export default function DocsRH() {
  const { success, error: toastError } = useToasts()

  const [demandes, setDemandes] = useState<DemandeDocument[]>([])
  const [stats, setStats] = useState<StatsDocuments>({ total: 0, aTraiter: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [acting, setActing] = useState<number | null>(null)
  const [showRefuse, setShowRefuse] = useState<DemandeDocument | null>(null)
  const [motif, setMotif] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [d, s] = await Promise.all([documentsApi.demandesRH(), documentsApi.stats()])
      setDemandes(d)
      setStats(s)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = demandes.filter((r) =>
    !search || r.employeNom.toLowerCase().includes(search.toLowerCase()) || r.typeDocument.toLowerCase().includes(search.toLowerCase()))

  const traiteCeMois = demandes.filter((d) => {
    const t = new Date(d.dateDemande)
    const now = new Date()
    return t.getMonth() === now.getMonth() && t.getFullYear() === now.getFullYear() && d.statut !== 'EN_TRAITEMENT'
  }).length

  const traiter = async (d: DemandeDocument) => {
    setActing(d.id)
    try {
      await documentsApi.traiter(d.id)
      success(`Document ${d.reference} généré`)
      load()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setActing(null)
    }
  }

  const refuser = async () => {
    if (!showRefuse || !motif.trim()) return
    setActing(showRefuse.id)
    try {
      await documentsApi.refuser(showRefuse.id, motif.trim())
      success(`Demande ${showRefuse.reference} refusée`)
      setShowRefuse(null)
      setMotif('')
      load()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setActing(null)
    }
  }

  const download = async (d: DemandeDocument) => {
    try {
      await documentsApi.telecharger(d.id)
      success('Téléchargement du PDF')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Documents — Vue RH</h1>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('gns:navigate', { detail: 'docs-collab' }))}
          className="px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90" style={{ background: '#111111' }}>
          + Demander un document
        </button>
      </div>

      {loading ? (
        <Spinner label="Chargement des demandes..." />
      ) : error ? (
        <ErrorBlock message={error} onRetry={load} />
      ) : (
        <>
          {/* KPI */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Demandes à traiter', value: stats.aTraiter, color: '#F59E0B', bg: '#FEF3C7' },
              { label: 'Traitées ce mois', value: traiteCeMois, color: '#10B981', bg: '#D1FAE5' },
              { label: 'Total demandes', value: stats.total, color: '#0F1E3D', bg: '#EFF6FF' },
            ].map((k, i) => (
              <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold" style={{ background: k.bg, color: k.color }}>
                  {k.value}
                </div>
                <div className="text-sm font-medium text-gray-700">{k.label}</div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2 rounded-lg px-3 py-2 border border-gray-200 flex-1 max-w-xs" style={{ background: '#F7F8FA' }}>
                <Search size={13} style={{ color: '#9CA3AF' }} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..."
                  className="bg-transparent text-xs outline-none flex-1" />
              </div>
              <div className="ml-auto text-xs text-gray-500">{filtered.length} demande(s)</div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Référence', 'Collaborateur', 'Type', 'Date', 'Statut', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-sm" style={{ color: '#9CA3AF' }}>Aucune demande</td></tr>
                ) : filtered.map((r) => {
                  const badge = STATUS_MAP[r.statut]
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-xs font-mono text-gray-400">{r.reference}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#0F1E3D] text-white flex items-center justify-center text-[10px] font-bold">{r.employeInitiales}</div>
                          <span className="text-xs font-medium text-gray-900">{r.employeNom}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-700">{r.typeDocument}</td>
                      <td className="px-5 py-3 text-xs text-gray-500">{fmtDate(r.dateDemande)}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: badge.bg, color: badge.color }}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1.5">
                          {r.statut === 'EN_TRAITEMENT' ? (
                            <>
                              <button onClick={() => traiter(r)} disabled={acting === r.id}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                                style={{ background: '#10B981' }}>
                                {acting === r.id ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Traiter
                              </button>
                              <button onClick={() => setShowRefuse(r)}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg"
                                style={{ color: '#B91C1C', border: '1px solid #FECACA' }}>
                                <X size={11} /> Refuser
                              </button>
                            </>
                          ) : r.statut === 'DISPONIBLE' ? (
                            <button onClick={() => download(r)}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 hover:bg-gray-50">
                              <Download size={11} /> PDF
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">{r.motifRefus}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal refus */}
      {showRefuse && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Refuser la demande {showRefuse.reference}</h3>
              <button onClick={() => setShowRefuse(null)} className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center"><X size={14} /></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-600">Motif du refus pour <strong>{showRefuse.employeNom}</strong> :</p>
              <textarea value={motif} onChange={(e) => setMotif(e.target.value)} rows={3}
                placeholder="Motif obligatoire..." className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none resize-none" />
              <div className="flex gap-2">
                <button onClick={() => setShowRefuse(null)} className="flex-1 py-2 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50">Annuler</button>
                <button onClick={refuser} disabled={!motif.trim() || acting === showRefuse.id}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60" style={{ background: '#B91C1C' }}>
                  Confirmer le refus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
