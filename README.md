# GNS SIRH — Application de gestion des ressources humaines

Application complète **frontend + backend connectés** : annuaire, congés & absences, dashboards KPI.

| Brique | Technologie |
|---|---|
| Frontend | React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + Recharts |
| Backend | Java 21 + Spring Boot 3.3 + Spring Security (JWT) + Spring Data JPA + Apache POI (Excel) |
| Base de données | MySQL 8 (profil `mysql`, défaut), H2 mémoire (`h2`) ou **H2 persistante (`h2file`)** — aucune installation requise |

Design conservé : palette marine `#0F1E3D`, or `#C9A227`, vert `#10B981`, ambre `#F59E0B`, rouge `#EF4444`.

---

## 1. Prérequis

- **Java 21** (JDK) — `java -version`
- **Maven 3.9+** — `mvn -version`
- **Node.js 18+** (22 recommandé) + npm
- **MySQL 8** (ou Docker pour le `docker-compose.yml` fourni)

## 2. Démarrage rapide

### a) Base de données MySQL

Option A — Docker (recommandé) :

```bash
docker compose up -d
```

Option B — MySQL local : créez la base `gns_sirh` (le backend la crée automatiquement via `createDatabaseIfNotExist`) et ajustez les identifiants si besoin :

```bash
# backend/src/main/resources/application-mysql.yml
# MYSQL_USER / MYSQL_PASSWORD (défauts : root / root)
```

### b) Backend Spring Boot

```bash
cd backend
mvn spring-boot:run          # profil mysql (par défaut)
# Test rapide sans MySQL (base H2 en mémoire) :
mvn spring-boot:run -Dspring-boot.run.profiles=h2
```

Au premier démarrage, le jeu de données de démonstration est créé automatiquement (12 employés, 8 types de congé, demandes, soldes, événements, comptes de test).

L'API écoute sur **http://localhost:8080**.

### c) Frontend React

```bash
npm install
npm run dev                  # http://localhost:8443
```

Le proxy Vite (`/api` → `http://localhost:8080`) relie le frontend au backend. Ouvrez **http://localhost:8443** et connectez-vous.

**Mode sans MySQL (recommandé pour démarrer vite)** : `\\.\\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=h2file"` — les données sont sauvegardées dans `backend\\data\\gns_sirh.mv.db`.

## 3. Modules livrés (v2)

Tous les modules sont **connectés backend ↔ frontend** avec règles métier réelles :

- **Annuaire & Compétences** — recherche paginée, missions, compétences, CRUD RH
- **Congés & Absences** — workflow complet + notifications RH bidirectionnelles
- **Événements d'entreprise** — inscriptions/désinscriptions, places max, export CSV des inscrits
- **Documents** — demandes, traitement RH, **génération réelle de PDF** (attestations...)
- **Notes de frais** — 4 cartes de synthèse, justificatifs uploadés, validation/remboursement RH
- **Recrutement** — kanban 5 étapes avec drag & drop persistant, CV, entretiens, **embauche → fiche employé créée**
- **Contrôle d'accès** — matrice de permissions appliquée côté backend (403 réel), gestion des comptes, **désactivation = révocation immédiate du token**, journal d'audit + export CSV
- **KPI & Reporting** — indicateurs filtrables par catégorie/département, **export Excel (.xlsx)**, historique des rapports re-téléchargeable
- **Dashboards RH & Collaborateur** — pointage arrivée/départ réel (+ badge « X en poste »), suivi des demandes du mois, actions en attente (congés + frais)

## 3. Comptes de test

| Profil | Email | Motif de passe | Rôle |
|---|---|---|---|
| Responsable RH | `rh@gns.ma` | `rh1234` | RESPONSABLE_RH |
| Collaborateur | `y.benali@gns.ma` | `collab1234` | COLLABORATEUR |
| Administrateur | `admin@gns.ma` | `admin1234` | ADMIN |

Parcours de démonstration :
1. Connectez-vous en **collaborateur** : consultez le solde (14 j), créez une demande de congé, annulez/modifiez tant qu'elle est en attente.
2. Connectez-vous en **RH** : la demande apparaît dans le planning collectif et dans « Actions en attente » du dashboard → validez (le solde diminue réellement) ou refusez avec motif.

## 4. Modules livrés

### Module Annuaire & Compétences (`/api/annuaire`)
- Liste paginée avec recherche (`q` : nom, prénom, poste, compétence) et filtre département
- Détail collaborateur (téléphone, email, bureau, manager via `Employe.responsable`, compétences)
- CRUD employé (RH uniquement, `403` pour un collaborateur même en forçant l'API), désactivation
- Gestion des compétences et des équipes (RH)
- Avatars et couleurs générés de façon déterministe

### Module Congés & Absences (`/api/conges`)
- KPI de solde réels (`soldeACeJour`, jours pris, absences justifiées, en attente)
- Types de congé (8 types avec règles : quota annuel, justificatif obligatoire, consommation du solde)
- Création / modification / annulation d'une demande (en attente uniquement), justificatif multipart
- Règles métier : solde suffisant, **pas de chevauchement**, jours ouvrés uniquement, quota annuel par type
- Validation / refus RH (motif obligatoire) → solde décrémenté, absences créées, historique `Validation`, notification, journal d'audit
- Planning collectif mensuel (grille jours/collaborateurs + effectif présent) et **export CSV**
- « Réserver un congé » pour un collaborateur (RH)

### Module Dashboards & Reporting (`/api/dashboard/rh`, `/api/reporting`)
- 8 KPI calculés sur les données réelles avec variation vs mois précédent
- Graphique « jours d'absence par mois » (8 derniers mois) et « effectifs par département »
- Actions en attente avec boutons Valider/Refuser connectés aux endpoints congés
- Activité récente (journal d'audit)
- Export CSV du planning et **rapport mensuel** (persisté dans `RapportRH`)
- Dashboard collaborateur : profil réel, solde, suivi des demandes, mon équipe, événements à venir
  (le pointage arrivée/départ est un état local, conformément à la convention du cahier des charges)

### Sécurité
- Authentification JWT (Bearer), mots de passe BCrypt, sessions stateless
- Contrôle par rôle `@PreAuthorize` (pas seulement caché en CSS)
- Format de réponse standard : `{status, message, data, timestamp, errors}`

## 5. Endpoints principaux

| Méthode | Endpoint | Rôle |
|---|---|---|
| POST | `/api/auth/login` | public |
| GET | `/api/auth/me`, `/api/employes/me` | authentifié |
| GET | `/api/annuaire/employes?q=&departement=&page=&size=` | authentifié |
| GET | `/api/annuaire/employes/{id}` | authentifié |
| POST/PUT/DELETE | `/api/annuaire/employes…` | RH |
| GET | `/api/departements`, `/api/postes`, `/api/equipes`, `/api/competences` | authentifié |
| GET | `/api/conges/solde`, `/api/conges/types`, `/api/conges/mes-demandes` | authentifié |
| POST/PUT | `/api/conges/demandes` (multipart) | authentifié (propriétaire) |
| PUT | `/api/conges/demandes/{id}/annuler` | propriétaire / RH |
| PUT | `/api/conges/demandes/{id}/valider`, `/refuser` | RH |
| GET | `/api/conges/calendrier-equipe`, `/api/conges/export` | RH |
| GET | `/api/dashboard/rh/kpis`, `/absences-mensuelles`, `/effectifs-departement`, `/actions-attente`, `/activite-recente` | RH |
| POST | `/api/reporting/rapports` | RH (téléchargement CSV) |
| GET | `/api/equipes/mon-equipe`, `/api/evenements/a-venir` | authentifié |
| GET/PUT | `/api/notifications` | authentifié |

## 6. Structure du projet

```
GNS_HR-app/
├── backend/                          # Spring Boot (Java 21)
│   ├── pom.xml
│   └── src/main/java/com/gns/sirh/
│       ├── config/                   # SecurityConfig, JwtService, JwtAuthFilter
│       ├── common/                   # ApiResponse, ApiPage, gestion d'erreurs
│       ├── controller/               # Auth, Annuaire, Congés, Dashboard, Notifications
│       ├── dto/                      # Records d'échange
│       ├── entity/                   # Employe, Utilisateur, DemandeConge, Absence, ...
│       ├── repository/               # Spring Data JPA
│       ├── service/                  # Règles métier
│       └── DataSeeder.java           # Données de démonstration (idempotent)
├── src/                              # Frontend React/TypeScript
│   ├── api/                          # http.ts, types.ts, modules.ts
│   ├── context/AuthContext.tsx       # JWT + session
│   ├── components/                   # Layout, ui (toasts/spinners)
│   └── screens/                      # Login, Annuaire, CongesCollab, CongesRH, DashboardRH, DashboardCollab
├── docker-compose.yml                # MySQL 8
└── README.md
```

## 7. Dépannage

- **« Connexion refusée » MySQL** : vérifiez les variables `MYSQL_USER` / `MYSQL_PASSWORD` dans `application-mysql.yml` ou lancez `docker compose up -d`.
- **Port 8080 occupé** : `server.port` dans `application.yml`.
- **Frontend sans backend** : le login renvoie une erreur réseau — démarrez d'abord le backend.
- **Mode démo sans MySQL** : `mvn spring-boot:run -Dspring-boot.run.profiles=h2`.
- La clé JWT (`app.jwt.secret`) est à changer en production.
