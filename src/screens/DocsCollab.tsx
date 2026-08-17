import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { X, Download, Loader2, FileText } from 'lucide-react'
import { documentsApi } from '../api/modules'
import type { DemandeDocument, IdLabel } from '../api/types'
import { ErrorBlock, fmtDate, Spinner, useToasts } from '../components/ui'

const STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
  DISPONIBLE: { bg: '#D1FAE5', color: '#065F46', label: 'Disponible' },
  EN_TRAITEMENT: { bg: '#FEF3C7', color: '#92400E', label: 'En traitement' },
  REFUSE: { bg: '#FEE2E2', color: '#991B1B', label: 'Refusé' },
}

export default function DocsCollab() {
  const { success, error: toastError } = useToasts()

  const [demandes, setDemandes] = useState<DemandeDocument[]>([])
  const [types, setTypes] = useState<IdLabel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [docType, setDocType] = useState('')
  const [format, setFormat] = useState<'DIGITAL' | 'PAPIER'>('DIGITAL')
  const [remark, setRemark] = useState('')
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<DemandeDocument | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [d, t] = await Promise.all([documentsApi.mesDemandes(), documentsApi.types()])
      setDemandes(d)
      setTypes(t)
      if (!docType && t.length > 0) setDocType(String(t[0].id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const ouvrir = () => setShowModal(true)
    window.addEventListener('gns:nouvelle-doc', ouvrir)
    return () => window.removeEventListener('gns:nouvelle-doc', ouvrir)
  }, [])

  const dispoDocs = demandes.filter((d) => d.statut === 'DISPONIBLE')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await documentsApi.creerDemande({ typeDocumentId: Number(docType), format, remarque: remark.trim() || undefined })
      success('Demande enregistrée')
      setShowModal(false)
      setRemark('')
      load()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const download = async (d: DemandeDocument) => {
    try {
      await documentsApi.telecharger(d.id)
      success('Document ouvert — prévisualisation dans un nouvel onglet')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur de téléchargement')
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Mes Documents</h1>
        <button onClick={() => setShowModal(true)}
          className="px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90" style={{ background: '#111111' }}>
          + Demander un document
        </button>
      </div>

      {loading ? (
        <Spinner label="Chargement de vos documents..." />
      ) : error ? (
        <ErrorBlock message={error} onRetry={load} />
      ) : (
        <div className="grid grid-cols-2 gap-5">
          {/* Documents récents (disponibles) */}
          <div className="bg-white rounded-xl border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Documents récents</h3>
            </div>
            <div className="p-4 grid grid-cols-1 gap-3">
              {dispoDocs.length === 0 ? (
                <div className="text-center py-10 text-sm" style={{ color: '#9CA3AF' }}>
                  Aucun document disponible — vos demandes traitées apparaîtront ici
                </div>
              ) : dispoDocs.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ background: '#F0F4FF' }}>
                    <FileText size={18} style={{ color: '#0F1E3D' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm text-gray-900 truncate">{doc.typeDocument} — {doc.reference}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#DBEAFE', color: '#1D4ED8', fontSize: 9 }}>NOUVEAU</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{fmtDate(doc.dateDemande)} · {doc.format === 'DIGITAL' ? 'Digital' : 'Papier'}</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setPreview(doc)}
                      className="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-500" title="Détails">
                      <FileText size={13} />
                    </button>
                    <button onClick={() => download(doc)}
                      className="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-100 transition-colors" title="Télécharger PDF"
                      style={{ color: '#0F1E3D' }}>
                      <Download size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Statut des demandes */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Statut des demandes</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Référence', 'Type', 'Format', 'Statut'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {demandes.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm" style={{ color: '#9CA3AF' }}>Aucune demande pour le moment</td></tr>
                ) : demandes.map((row) => {
                  const badge = STATUS_MAP[row.statut]
                  return (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-xs font-mono text-gray-400">{row.reference}</td>
                      <td className="px-4 py-3 text-gray-700 text-xs">{row.typeDocument}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: '#F3F4F6', color: '#374151' }}>{row.format}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: badge.bg, color: badge.color }}>
                          {badge.label}
                        </span>
                        {row.statut === 'DISPONIBLE' && (
                          <button onClick={() => download(row)} className="ml-2 text-xs font-semibold hover:underline" style={{ color: '#0F1E3D' }}>
                            Télécharger
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal demande doc */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Demander un document</h2>
              <button onClick={() => setShowModal(false)} className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center"><X size={15} /></button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Type de document *</label>
                <select value={docType} onChange={(e) => setDocType(e.target.value)} required
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none">
                  {types.map((t) => <option key={t.id} value={t.id}>{t.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Format souhaité</label>
                <div className="flex gap-4">
                  {([{ key: 'DIGITAL', label: '💻 Digital' }, { key: 'PAPIER', label: '🖨️ Papier' }] as const).map((f) => (
                    <label key={f.key} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="format" checked={format === f.key} onChange={() => setFormat(f.key)}
                        className="rounded-full" />
                      <span className="text-sm text-gray-700">{f.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Remarques</label>
                <textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={3}
                  placeholder="Précisions éventuelles..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2" style={{ background: '#111111' }}>
                  {saving && <Loader2 size={13} className="animate-spin" />} Demander
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Détail document */}
      {preview && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{preview.typeDocument} — {preview.reference}</h2>
              <button onClick={() => setPreview(null)} className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center"><X size={15} /></button>
            </div>
            <div className="p-8" style={{ fontFamily: 'Georgia, serif' }}>
              <div className="text-center mb-6">
                <div className="font-bold text-xl" style={{ color: '#0F1E3D' }}>GNS TECHNOLOGIES</div>
                <div className="text-xs text-gray-500 mt-0.5">Société à Responsabilité Limitée · Casablanca, Maroc</div>
              </div>
              <div className="text-center font-bold text-lg mb-6 underline" style={{ color: '#0F1E3D' }}>
                {preview.typeDocument.toUpperCase()}
              </div>
              <div className="text-sm leading-7 text-gray-700 space-y-3">
                <p>Document délivré à <strong>{preview.employeNom}</strong>,</p>
                <p>format <strong>{preview.format === 'DIGITAL' ? 'numérique' : 'papier'}</strong>{preview.remarque ? `, remarque : « ${preview.remarque} »` : ''}.</p>
                <p>Ce document a été généré et certifié par le service RH de GNS Technologies.</p>
              </div>
              <div className="flex justify-end mt-8">
                <div className="text-right">
                  <div className="text-sm text-gray-700">Casablanca, le {fmtDate(preview.dateDemande)}</div>
                  <div className="mt-6 inline-block rounded-full border-2 px-3 py-2 text-center"
                    style={{ borderColor: '#0F1E3D', color: '#0F1E3D', fontSize: 8, fontWeight: 700 }}>
                    GNS TECHNOLOGIES ✓ CERTIFIÉ
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => download(preview)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 flex items-center justify-center gap-1.5 text-white"
                style={{ background: '#0F1E3D' }}>
                <Download size={14} /> Télécharger le PDF réel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
