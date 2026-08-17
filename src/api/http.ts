/**
 * Client HTTP centralisé : attache le token JWT, gère les erreurs,
 * et déconnecte l'utilisateur en cas de 401.
 */
export const API_BASE = '/api'

export const TOKEN_KEY = 'gns_token'
export const USER_KEY = 'gns_user'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

function buildHeaders(options: RequestInit): HeadersInit {
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  const body = options.body
  if (body && !(body instanceof FormData) && !(body instanceof URLSearchParams)) {
    headers['Content-Type'] = 'application/json'
  }
  return { ...headers, ...((options.headers as Record<string, string>) ?? {}) }
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(API_BASE + path, { ...options, headers: buildHeaders(options) })

  if (res.status === 401) {
    clearSession()
    window.dispatchEvent(new Event('gns:unauthorized'))
  }

  let payload: { data?: T; message?: string } | null = null
  try {
    payload = (await res.json()) as { data?: T; message?: string }
  } catch {
    payload = null
  }

  if (!res.ok) {
    const message = payload?.message || `Erreur ${res.status}`
    throw new ApiError(res.status, message)
  }
  // Renvoie payload.data même s'il est null (null = résultat valide, ex. pointage du jour)
  return (payload !== null && 'data' in payload ? payload.data : payload) as T
}

export const get = <T>(path: string) => request<T>(path)
export const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) })
export const put = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) })
export const del = <T>(path: string) => request<T>(path, { method: 'DELETE' })

export async function postForm<T>(path: string, form: FormData): Promise<T> {
  return request<T>(path, { method: 'POST', body: form })
}

export async function putForm<T>(path: string, form: FormData): Promise<T> {
  return request<T>(path, { method: 'PUT', body: form })
}

/** Ouvre un fichier (PDF, justificatif...) dans un nouvel onglet du navigateur pour prévisualisation. */
export async function ouvrirFichier(path: string, filename: string, init: RequestInit = {}) {
  const res = await fetch(API_BASE + path, { ...init, headers: buildHeaders(init) })
  if (!res.ok) {
    let message = `Erreur ${res.status}`
    try {
      const payload = (await res.json()) as { message?: string }
      message = payload?.message || message
    } catch {
      /* réponse non JSON */
    }
    throw new ApiError(res.status, message)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')
  if (!win) {
    // Pop-up bloquée : repli sur un téléchargement direct
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  }
  // L'objet URL reste utilisable le temps de la prévisualisation dans l'onglet
  setTimeout(() => URL.revokeObjectURL(url), 120_000)
}

/** Téléchargement d'un fichier (CSV...) avec le token JWT. */
export async function downloadFile(path: string, filename: string, init: RequestInit = {}) {
  const res = await fetch(API_BASE + path, { ...init, headers: buildHeaders(init) })
  if (!res.ok) {
    let message = `Erreur ${res.status}`
    try {
      const payload = (await res.json()) as { message?: string }
      message = payload?.message || message
    } catch {
      /* réponse non JSON */
    }
    throw new ApiError(res.status, message)
  }
  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition') || ''
  const match = disposition.match(/filename="?([^";]+)"?/)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = match ? match[1] : filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
