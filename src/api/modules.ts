/**
 * Fonctions API du frontend — tous les modules.
 */
import {
  get, post, put, del, postForm, downloadFile, ouvrirFichier, request,
} from './http'
import type {
  AuthResponse, EmployeProfile, ApiPage, EmployeListItem, EmployeDetail, IdLabel,
  TypeConge, DemandeConge, SoldeResponse, CalendrierEquipe,
  KpiCard, AbsenceMensuelle, DeptCount, ActionAttente, ActiviteItem,
  EvenementItem, MonEquipeMember, NotificationPayload,
  DemandeDocument, StatsDocuments, NoteFrais, SyntheseFrais, Pointage,
  OffreEmploi, Candidature, KpiReport, UtilisateurCompte, Permission, AuditEntry, SondageDuJour,
} from './types'

// ---------------- Auth ----------------
export const authApi = {
  login: (email: string, password: string) =>
    post<AuthResponse>('/auth/login', { email, password }),
  inscription: (email: string, prenom: string, nom: string, password: string) =>
    post<AuthResponse>('/auth/register', { email, prenom, nom, password }),
  me: () => get<EmployeProfile>('/auth/me'),
  changePassword: (ancienMotDePasse: string, nouveauMotDePasse: string) =>
    post<void>('/auth/change-password', { ancienMotDePasse, nouveauMotDePasse }),
}

// ---------------- Employé / référentiel ----------------
export const employeApi = {
  me: () => get<EmployeProfile>('/employes/me'),
  departements: () => get<IdLabel[]>('/departements'),
  postes: () => get<IdLabel[]>('/postes'),
  equipes: () => get<IdLabel[]>('/equipes'),
  competences: () => get<IdLabel[]>('/competences'),
}

// ---------------- Annuaire ----------------
export interface AnnuaireParams {
  q?: string
  departement?: string
  page?: number
  size?: number
}

export const annuaireApi = {
  rechercher: (params: AnnuaireParams = {}) => {
    const query = new URLSearchParams()
    if (params.q) query.set('q', params.q)
    if (params.departement) query.set('departement', params.departement)
    query.set('page', String(params.page ?? 0))
    query.set('size', String(params.size ?? 12))
    return get<ApiPage<EmployeListItem>>(`/annuaire/employes?${query.toString()}`)
  },
  detail: (id: number) => get<EmployeDetail>(`/annuaire/employes/${id}`),
  creer: (body: Record<string, unknown>) => post<EmployeDetail>('/annuaire/employes', body),
  modifier: (id: number, body: Record<string, unknown>) => put<EmployeDetail>(`/annuaire/employes/${id}`, body),
  desactiver: (id: number) => del<void>(`/annuaire/employes/${id}`),
  activer: (id: number) => put<void>(`/annuaire/employes/${id}/activer`),
  ajouterCompetences: (id: number, competenceIds: number[]) =>
    post<EmployeDetail>(`/annuaire/employes/${id}/competences`, competenceIds),
  retirerCompetence: (id: number, competenceId: number) =>
    del<EmployeDetail>(`/annuaire/employes/${id}/competences/${competenceId}`),
}

// ---------------- Congés & Absences ----------------
export interface DemandePayload {
  typeCongeId: number
  dateDebut: string
  dateFin: string
  motif?: string
  employeId?: number
}

export const congesApi = {
  solde: () => get<SoldeResponse>('/conges/solde'),
  types: () => get<TypeConge[]>('/conges/types'),
  mesDemandes: (mois?: number, annee?: number) => {
    const query = new URLSearchParams()
    if (mois !== undefined) query.set('mois', String(mois))
    if (annee !== undefined) query.set('annee', String(annee))
    return get<DemandeConge[]>(`/conges/mes-demandes?${query.toString()}`)
  },
  detail: (id: number) => get<DemandeConge>(`/conges/demandes/${id}`),
  creer: (payload: DemandePayload, justificatif?: File | null) => {
    const form = new FormData()
    form.append('demande', JSON.stringify(payload))
    if (justificatif) form.append('justificatif', justificatif)
    return postForm<DemandeConge>('/conges/demandes', form)
  },
  modifier: (id: number, payload: DemandePayload, justificatif?: File | null) => {
    const form = new FormData()
    form.append('demande', JSON.stringify(payload))
    if (justificatif) form.append('justificatif', justificatif)
    return request<DemandeConge>(`/conges/demandes/${id}`, { method: 'PUT', body: form })
  },
  annuler: (id: number) => put<DemandeConge>(`/conges/demandes/${id}/annuler`),
  valider: (id: number) => put<DemandeConge>(`/conges/demandes/${id}/valider`),
  refuser: (id: number, motif: string) =>
    put<DemandeConge>(`/conges/demandes/${id}/refuser`, { motif }),
  justificatif: (fileName: string) =>
    ouvrirFichier(`/conges/justificatifs/${encodeURIComponent(fileName)}`, fileName),
  calendrierEquipe: (mois?: number, annee?: number) => {
    const query = new URLSearchParams()
    if (mois !== undefined) query.set('mois', String(mois))
    if (annee !== undefined) query.set('annee', String(annee))
    return get<CalendrierEquipe>(`/conges/calendrier-equipe?${query.toString()}`)
  },
  exportCsv: (mois: number, annee: number) =>
    downloadFile(`/conges/export?mois=${mois}&annee=${annee}`, 'planning_conges.csv'),
}

// ---------------- Événements ----------------
export const evenementsApi = {
  lister: () => get<EvenementItem[]>('/evenements'),
  mesInscriptions: () => get<EvenementItem[]>('/evenements/mes-inscriptions'),
  aVenir: () => get<EvenementItem[]>('/evenements/a-venir'),
  inscrire: (id: number) => post<EvenementItem>(`/evenements/${id}/inscription`),
  desinscrire: (id: number) => del<EvenementItem>(`/evenements/${id}/inscription`),
  creer: (body: Record<string, unknown>) => post<EvenementItem>('/evenements', body),
  modifier: (id: number, body: Record<string, unknown>) => put<EvenementItem>(`/evenements/${id}`, body),
  supprimer: (id: number) => del<void>(`/evenements/${id}`),
  inscrits: (id: number) => get<{ employeId: number; nomComplet: string; email: string; departement: string | null; dateInscription: string }[]>(`/evenements/${id}/inscrits`),
  exportInscrits: (id: number) => downloadFile(`/evenements/${id}/inscrits/export`, 'inscrits.csv'),
}

// ---------------- Documents ----------------
export const documentsApi = {
  types: () => get<IdLabel[]>('/documents/types'),
  creerDemande: (body: { typeDocumentId: number; format: string; remarque?: string }) =>
    post<DemandeDocument>('/documents/demandes', body),
  mesDemandes: () => get<DemandeDocument[]>('/documents/mes-demandes'),
  demandesRH: () => get<DemandeDocument[]>('/documents/demandes'),
  stats: () => get<StatsDocuments>('/documents/stats'),
  traiter: (id: number) => post<DemandeDocument>(`/documents/demandes/${id}/traiter`),
  refuser: (id: number, motif: string) =>
    post<DemandeDocument>(`/documents/demandes/${id}/refuser`, { motif }),
  telecharger: (id: number) => ouvrirFichier(`/documents/${id}/telecharger`, 'document.pdf'),
}

// ---------------- Notes de frais ----------------
export const fraisApi = {
  synthese: () => get<SyntheseFrais>('/frais/mes-notes/synthese'),
  mesNotes: () => get<NoteFrais[]>('/frais/mes-notes'),
  creer: (note: Record<string, unknown>, justificatifs?: File[]) => {
    const form = new FormData()
    form.append('note', JSON.stringify(note))
    justificatifs?.forEach((f) => form.append('justificatifs', f))
    return postForm<NoteFrais>('/frais/notes', form)
  },
  detail: (id: number) => get<NoteFrais>(`/frais/notes/${id}`),
  modifier: (id: number, note: Record<string, unknown>, justificatifs?: File[]) => {
    const form = new FormData()
    form.append('note', JSON.stringify(note))
    justificatifs?.forEach((f) => form.append('justificatifs', f))
    return request<NoteFrais>(`/frais/notes/${id}`, { method: 'PUT', body: form })
  },
  annuler: (id: number) => put<NoteFrais>(`/frais/notes/${id}/annuler`),
  notesRH: (params: { q?: string; statut?: string; debut?: string; fin?: string } = {}) => {
    const query = new URLSearchParams()
    if (params.q) query.set('q', params.q)
    if (params.statut) query.set('statut', params.statut)
    if (params.debut) query.set('debut', params.debut)
    if (params.fin) query.set('fin', params.fin)
    return get<NoteFrais[]>(`/frais/notes?${query.toString()}`)
  },
  valider: (id: number) => put<NoteFrais>(`/frais/notes/${id}/valider`),
  rembourser: (id: number) => put<NoteFrais>(`/frais/notes/${id}/rembourser`),
  refuser: (id: number, motif: string) =>
    put<NoteFrais>(`/frais/notes/${id}/refuser`, { motif }),
  justificatif: (fileName: string) =>
    ouvrirFichier(`/frais/justificatifs/${encodeURIComponent(fileName)}`, fileName),
}

// ---------------- Pointage ----------------
export const pointageApi = {
  arrivee: () => post<Pointage>('/pointage/arrivee'),
  depart: () => post<Pointage>('/pointage/depart'),
  aujourdhui: () => get<Pointage | null>('/pointage/aujourdhui'),
  enPoste: () => get<number>('/pointage/en-poste'),
}

// ---------------- Recrutement ----------------
export const recrutementApi = {
  offres: () => get<OffreEmploi[]>('/recrutement/offres'),
  publierOffre: (body: Record<string, unknown>) => post<OffreEmploi>('/recrutement/offres', body),
  modifierOffre: (id: number, body: Record<string, unknown>) => put<OffreEmploi>(`/recrutement/offres/${id}`, body),
  candidatures: (offreId: number) => get<Candidature[]>(`/recrutement/offres/${offreId}/candidatures`),
  detailCandidature: (id: number) => get<Candidature>(`/recrutement/candidatures/${id}`),
  ajouterCandidat: (candidat: Record<string, unknown>, cv?: File | null, lettre?: File | null) => {
    const form = new FormData()
    form.append('candidat', JSON.stringify(candidat))
    if (cv) form.append('cv', cv)
    if (lettre) form.append('lettre', lettre)
    return postForm<Candidature>('/recrutement/candidats', form)
  },
  changerEtape: (id: number, etape: string) =>
    put<Candidature>(`/recrutement/candidatures/${id}/etape`, { etape }),
  planifierEntretien: (id: number, dateEntretien: string) =>
    put<Candidature>(`/recrutement/candidatures/${id}/entretien`, { dateEntretien }),
  embaucher: (id: number) => post<Candidature>(`/recrutement/candidatures/${id}/embaucher`),
  cv: (fileName: string) =>
    ouvrirFichier(`/recrutement/fichiers/cv/${encodeURIComponent(fileName)}`, fileName),
}

// ---------------- Sécurité ----------------
export const securiteApi = {
  permissions: () => get<Permission[]>('/securite/permissions'),
  roles: () => get<Record<string, string[]>>('/securite/roles'),
  majPermissions: (role: string, codes: string[]) =>
    put<Record<string, string[]>>(`/securite/roles/${role}/permissions`, codes),
  utilisateurs: () => get<UtilisateurCompte[]>('/securite/utilisateurs'),
  creerUtilisateur: (body: Record<string, unknown>) => post<UtilisateurCompte>('/securite/utilisateurs', body),
  modifierUtilisateur: (id: number, body: Record<string, unknown>) =>
    put<UtilisateurCompte>(`/securite/utilisateurs/${id}`, body),
  audit: () => get<AuditEntry[]>('/securite/audit'),
  exportAudit: () => downloadFile('/securite/audit/export', 'journal_audit.csv'),
}

// ---------------- Dashboard ----------------
export const dashboardApi = {
  kpis: () => get<KpiCard[]>('/dashboard/rh/kpis'),
  absencesMensuelles: () => get<AbsenceMensuelle[]>('/dashboard/rh/absences-mensuelles'),
  effectifsDepartement: () => get<DeptCount[]>('/dashboard/rh/effectifs-departement'),
  actionsAttente: () => get<ActionAttente[]>('/dashboard/rh/actions-attente'),
  activiteRecent: () => get<ActiviteItem[]>('/dashboard/rh/activite-recente'),
  evenementsAVenir: () => get<EvenementItem[]>('/evenements/a-venir'),
  monEquipe: () => get<MonEquipeMember[]>('/equipes/mon-equipe'),
}

// ---------------- KPI & Reporting ----------------
export const reportingApi = {
  kpis: (params: { categorie?: string; departement?: string } = {}) => {
    const query = new URLSearchParams()
    if (params.categorie) query.set('categorie', params.categorie)
    if (params.departement) query.set('departement', params.departement)
    return get<KpiReport[]>(`/reporting/kpis?${query.toString()}`)
  },
  rapports: () => get<{ id: number; titre: string; typeRapport: string; dateGeneration: string; format: string; fichier: string }[]>('/reporting/rapports'),
  rapportDownload: (id: number) => downloadFile(`/reporting/rapports/${id}/telecharger`, 'rapport.csv'),
  rapportMensuel: () => downloadFile('/reporting/rapports', 'rapport_rh.csv', { method: 'POST' }),
  rapportCsv: (titre: string) =>
    downloadFile('/reporting/rapports', 'rapport_rh.csv', {
      method: 'POST',
      body: JSON.stringify({ titre }),
      headers: { 'Content-Type': 'application/json' },
    }),
  exportXlsx: (params: { categorie?: string; departement?: string } = {}) => {
    const query = new URLSearchParams()
    if (params.categorie) query.set('categorie', params.categorie)
    if (params.departement) query.set('departement', params.departement)
    return downloadFile(`/reporting/export-xlsx?${query.toString()}`, 'kpi_reporting.xlsx')
  },
}

// ---------------- Notifications ----------------
export const notificationsApi = {
  lister: () => get<NotificationPayload>('/notifications'),
  toutLire: () => put<number>('/notifications/lire'),
  lireUne: (id: number) => put<void>(`/notifications/${id}/lue`),
}

// ---------------- Sondage du jour ----------------
export const sondageApi = {
  aujourdhui: () => get<SondageDuJour>('/sondage/aujourdhui'),
  repondre: (id: number, option: string) =>
    post<SondageDuJour>(`/sondage/${id}/repondre`, { option }),
  lister: () => get<SondageDuJour[]>('/sondage'),
  creer: (body: { question: string; options: string[]; date?: string }) =>
    post<SondageDuJour>('/sondage', body),
  modifier: (id: number, body: { question: string; options: string[]; date?: string }) =>
    put<SondageDuJour>(`/sondage/${id}`, body),
}
