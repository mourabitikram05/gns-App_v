import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Plus, X, Download, CalendarClock, Star, GripVertical, UserCheck } from 'lucide-react'
import { recrutementApi } from '../api/modules'
import type { Candidature, OffreEmploi } from '../api/types'
import { ErrorBlock, Spinner, useToasts } from '../components/ui'

const COLUMNS: { key: Candidature['etape']; label: string; color: string }[] = [
  { key: 'BOITE_RECEPTION', label: 'Boîte réception', color: '#0F1E3D' },
  { key: 'BROUILLON', label: 'Brouillon', color: '#6B7280' },
  { key: 'ENTRETIEN_TEL', label: 'Entretien tél.', color: '#F59E0B' },
  { key: 'ENTRETIEN_PHYSIQUE', label: 'Entretien physique', color: '#C9A227' },
  { key: 'EMBAUCHE', label: 'Embauché', color: '#10B981' },
]

export default function Recrutement() {
  const { success, error: toastError } = useToasts()

  const [offres, setOffres] = useState<OffreEmploi[]>([])
  const [offreId, setOffreId] = useState<number | null>(null)
  const [candidatures, setCandidatures] = useState<Candidature[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showOffre, setShowOffre] = useState(false)
  const [showCandidat, setShowCandidat] = useState(false)
  const [detail, setDetail] = useState<Candidature | null>(null)
  const [dragId, setDragId] = useState<number | null>(null)

  // Formulaire offre
  const [offreForm, setOffreForm] = useState({ titre: '', departement: '', typeContrat: 'CDI', niveau: '', mode: 'HYBRIDE' })
  // Formulaire candidat
  const [candForm, setCandForm] = useState({ offreId: '', nom: '', prenom: '', email: '', telephone: '', linkedin: '' })
  const [cv, setCv] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  const loadOffres = useCallback(async () => {
    try {
      const list = await recrutementApi.offres()
      setOffres(list)
      if (!offreId && list.length > 0) setOffreId(list[0].id)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadOffres()
  }, [loadOffres])

  const loadCandidatures = useCallback(async (oid: number) => {
    setLoading(true)
    setError('')
    try {
      setCandidatures(await recrutementApi.candidatures(oid))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (offreId) loadCandidatures(offreId)
  }, [offreId, loadCandidatures])

  const byColumn = (key: string) => candidatures.filter((c) => c.etape === key)

  const dropOn = async (etape: Candidature['etape']) => {
    if (dragId == null) return
    try {
      const updated = await recrutementApi.changerEtape(dragId, etape)
      setCandidatures((prev) => prev.map((c) => (c.id === dragId ? updated : c)))
      if (detail?.id === dragId) setDetail(updated)
      success('Étape mise à jour (persistée)')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setDragId(null)
    }
  }

  const submitOffre = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await recrutementApi.publierOffre({ ...offreForm, statut: 'OUVERTE' })
      success('Offre publiée')
      setShowOffre(false)
      setOffreForm({ titre: '', departement: '', typeContrat: 'CDI', niveau: '', mode: 'HYBRIDE' })
      await loadOffres()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const submitCandidat = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await recrutementApi.ajouterCandidat({ ...candForm, offreId: Number(candForm.offreId) }, cv)
      success('Candidature enregistrée')
      setShowCandidat(false)
      setCandForm({ offreId: String(offreId ?? ''), nom: '', prenom: '', email: '', telephone: '', linkedin: '' })
      setCv(null)
      if (offreId) await loadCandidatures(offreId)
      await loadOffres()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const planifierEntretien = async (c: Candidature) => {
    const str = window.prompt('Date et heure de l\'entretien (format : 2026-09-01T10:00) :')
    if (!str) return
    try {
      const updated = await recrutementApi.planifierEntretien(c.id, str)
      setCandidatures((prev) => prev.map((x) => (x.id === c.id ? updated : x)))
      setDetail(updated)
      success('Entretien planifié — recruteurs notifiés')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  const embaucher = async (c: Candidature) => {
    if (!window.confirm(`Embaucher ${c.nomComplet} ? Une fiche employé sera créée dans le Core RH.`)) return
    try {
      const updated = await recrutementApi.embaucher(c.id)
      setCandidatures((prev) => prev.map((x) => (x.id === c.id ? updated : x)))
      setDetail(updated)
      success('Candidat embauché — fiche employé créée')
      loadOffres()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  const downloadCv = (c: Candidature) => {
    if (!c.cvNom) return
    recrutementApi.cv(c.cvNom)
      .then(() => success('CV téléchargé'))
      .catch((e) => toastError(e.message))
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Recrutement — Kanban RH</h1>
        <div className="flex gap-2">
          <select value={offreId ?? ''} onChange={(e) => setOffreId(Number(e.target.value))}
            className="text-sm rounded-lg border border-gray-200 px-3 py-2 outline-none max-w-xs">
            {offres.map((o) => <option key={o.id} value={o.id}>{o.titre} ({o.totalCandidatures})</option>)}
          </select>
          <button onClick={() => setShowCandidat(true)} disabled={!offreId}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            <Plus size={14} /> Ajouter un candidat
          </button>
          <button onClick={() => setShowOffre(true)}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90" style={{ background: '#111111' }}>
            + Publier une offre
          </button>
        </div>
      </div>

      {loading ? (
        <Spinner label="Chargement des candidatures..." />
      ) : error ? (
        <ErrorBlock message={error} onRetry={() => offreId && loadCandidatures(offreId)} />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {COLUMNS.map((col) => {
            const items = byColumn(col.key)
            const offre = offres.find((o) => o.id === offreId)
            const count = offre?.candidaturesParEtape?.[col.key] ?? items.length
            return (
              <div key={col.key} className="flex-1 min-w-[220px] bg-gray-50 rounded-xl p-3 border border-gray-100"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => dropOn(col.key)}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: col.color }}>
                    {col.label}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: col.color + '18', color: col.color }}>{count}</span>
                </div>
                <div className="space-y-2 min-h-[80px]">
                  {items.map((c) => (
                    <div key={c.id} draggable onDragStart={() => setDragId(c.id)}
                      onClick={() => setDetail(c)}
                      className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                      style={{ borderLeft: `3px solid ${col.color}` }}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-[#0F1E3D] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {c.initiales}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-gray-900 truncate">{c.nomComplet}</div>
                          <div className="text-[10px] text-gray-400 truncate">{c.email}</div>
                        </div>
                        <GripVertical size={12} className="ml-auto text-gray-300 flex-shrink-0" />
                      </div>
                      {c.dateEntretien && (
                        <div className="flex items-center gap-1 text-[10px] font-medium" style={{ color: '#F59E0B' }}>
                          <CalendarClock size={10} /> {new Date(c.dateEntretien).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="text-center text-[10px] text-gray-300 py-6 border border-dashed border-gray-200 rounded-lg">Glissez une carte ici</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal publier offre */}
      {showOffre && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Publier une offre d'emploi</h2>
              <button onClick={() => setShowOffre(false)} className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center"><X size={15} /></button>
            </div>
            <form onSubmit={submitOffre} className="p-6 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Titre *</label>
                <input required value={offreForm.titre} onChange={(e) => setOffreForm((f) => ({ ...f, titre: e.target.value }))}
                  placeholder="Ex. Développeur Full-Stack" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Département</label>
                  <input value={offreForm.departement} onChange={(e) => setOffreForm((f) => ({ ...f, departement: e.target.value }))}
                    placeholder="Tech" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Type de contrat</label>
                  <select value={offreForm.typeContrat} onChange={(e) => setOffreForm((f) => ({ ...f, typeContrat: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none">
                    {['CDI', 'CDD', 'Stage', 'Freelance'].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Niveau d'expérience</label>
                  <input value={offreForm.niveau} onChange={(e) => setOffreForm((f) => ({ ...f, niveau: e.target.value }))}
                    placeholder="Confirmé" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Mode de travail</label>
                  <select value={offreForm.mode} onChange={(e) => setOffreForm((f) => ({ ...f, mode: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none">
                    {['HYBRIDE', 'REMOTE', 'SUR_PLACE'].map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowOffre(false)} className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60" style={{ background: '#111111' }}>
                  Publier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal ajouter candidat */}
      {showCandidat && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Ajouter un candidat</h2>
              <button onClick={() => setShowCandidat(false)} className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center"><X size={15} /></button>
            </div>
            <form onSubmit={submitCandidat} className="p-6 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Offre *</label>
                <select required value={candForm.offreId || String(offreId ?? '')} onChange={(e) => setCandForm((f) => ({ ...f, offreId: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none">
                  {offres.map((o) => <option key={o.id} value={o.id}>{o.titre}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nom *</label>
                  <input required value={candForm.nom} onChange={(e) => setCandForm((f) => ({ ...f, nom: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Prénom *</label>
                  <input required value={candForm.prenom} onChange={(e) => setCandForm((f) => ({ ...f, prenom: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email *</label>
                <input type="email" required value={candForm.email} onChange={(e) => setCandForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Téléphone</label>
                  <input value={candForm.telephone} onChange={(e) => setCandForm((f) => ({ ...f, telephone: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">LinkedIn</label>
                  <input value={candForm.linkedin} onChange={(e) => setCandForm((f) => ({ ...f, linkedin: e.target.value }))}
                    placeholder="linkedin.com/in/..." className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">CV (PDF)</label>
                <input type="file" accept=".pdf" onChange={(e) => setCv(e.target.files?.[0] ?? null)}
                  className="w-full text-xs" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCandidat(false)} className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60" style={{ background: '#111111' }}>
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Détail candidat */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#0F1E3D] text-white flex items-center justify-center font-bold">{detail.initiales}</div>
                <div>
                  <div className="font-semibold text-gray-900">{detail.nomComplet}</div>
                  <div className="text-xs text-gray-400">{detail.offreTitre}</div>
                </div>
              </div>
              <button onClick={() => setDetail(null)} className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center"><X size={15} /></button>
            </div>
            <div className="p-6 space-y-3">
              {[
                { label: 'Email', value: detail.email },
                { label: 'Téléphone', value: detail.telephone ?? '—' },
                { label: 'LinkedIn', value: detail.linkedin ?? '—' },
                { label: 'Reçu le', value: new Date(detail.dateCreation).toLocaleDateString('fr-FR') },
              ].map((row, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-500">{row.label}</span>
                  <span className="font-medium text-gray-900 truncate">{row.value}</span>
                </div>
              ))}
              {detail.cvDisponible && (
                <button onClick={() => downloadCv(detail)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 hover:bg-gray-50">
                  <Download size={12} /> Télécharger le CV ({detail.cvNom})
                </button>
              )}
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-2">Historique</div>
                <div className="space-y-1.5">
                  {detail.historique.map((h, i) => (
                    <div key={i} className="text-xs text-gray-600 px-3 py-2 rounded-lg" style={{ background: '#F7F8FA' }}>{h}</div>
                  ))}
                </div>
              </div>
              {detail.etape !== 'EMBAUCHE' && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button onClick={() => planifierEntretien(detail)}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-1">
                    <CalendarClock size={11} /> Planifier un entretien
                  </button>
                  <button onClick={() => embaucher(detail)}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold text-white hover:opacity-90 flex items-center justify-center gap-1" style={{ background: '#10B981' }}>
                    <UserCheck size={11} /> Embaucher
                  </button>
                </div>
              )}
              {detail.etape === 'EMBAUCHE' && (
                <div className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: '#D1FAE5', color: '#065F46' }}>
                  <Star size={11} /> Candidat embauché — fiche employé créée
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
