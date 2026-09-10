-- Extension nécessaire pour la contrainte d'exclusion sur les plages horaires
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ==========================================================
-- TABLE : utilisateur
-- ==========================================================
CREATE TABLE utilisateur (
    id              BIGSERIAL PRIMARY KEY,
    nom             VARCHAR(100) NOT NULL,
    prenom          VARCHAR(100) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    mot_de_passe    VARCHAR(255) NOT NULL,          -- haché, jamais en clair
    role            VARCHAR(30) NOT NULL
                    CHECK (role IN ('administrateur', 'directeur_antenne', 'diffuseur')),
    fonction        VARCHAR(100),                    -- si role IN (administrateur, directeur_antenne)
    poste_regie     VARCHAR(100),                    -- si role = diffuseur
    est_actif       BOOLEAN NOT NULL DEFAULT TRUE,
    date_creation   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_utilisateur_role ON utilisateur(role);

-- ==========================================================
-- TABLE : chaine
-- ==========================================================
CREATE TABLE chaine (
    id      BIGSERIAL PRIMARY KEY,
    nom     VARCHAR(100) NOT NULL UNIQUE,     -- ex : "Radio Balafon", "Balafon TV"
    slug    VARCHAR(120) NOT NULL UNIQUE,
    type    VARCHAR(20) NOT NULL CHECK (type IN ('radio', 'tv')),
    actif   BOOLEAN NOT NULL DEFAULT TRUE
);

-- ==========================================================
-- TABLE : grille
-- ==========================================================
CREATE TABLE grille (
    id              BIGSERIAL PRIMARY KEY,
    chaine_id       BIGINT NOT NULL REFERENCES chaine(id) ON DELETE RESTRICT,
    date_debut      DATE NOT NULL,
    date_fin        DATE NOT NULL,
    statut          VARCHAR(20) NOT NULL DEFAULT 'brouillon'
                    CHECK (statut IN ('brouillon', 'en_validation', 'validee')),
    date_creation   TIMESTAMPTZ NOT NULL DEFAULT now(),
    date_validation TIMESTAMPTZ,
    cree_par_id     BIGINT NOT NULL REFERENCES utilisateur(id) ON DELETE RESTRICT,
    valide_par_id   BIGINT REFERENCES utilisateur(id) ON DELETE SET NULL,
    CHECK (date_fin >= date_debut)
);

CREATE INDEX idx_grille_chaine_dates ON grille(chaine_id, date_debut, date_fin);
CREATE INDEX idx_grille_statut ON grille(statut);

-- ==========================================================
-- TABLE : emission
-- ==========================================================
CREATE TABLE emission (
    id              BIGSERIAL PRIMARY KEY,
    grille_id       BIGINT NOT NULL REFERENCES grille(id) ON DELETE CASCADE,
    titre           VARCHAR(200) NOT NULL,
    genre           VARCHAR(50) NOT NULL DEFAULT 'autre',
    description     TEXT,
    heure_debut     TIMESTAMPTZ NOT NULL,
    heure_fin       TIMESTAMPTZ NOT NULL,
    CHECK (heure_fin > heure_debut),
    -- Empêche deux émissions de la même grille de se chevaucher dans le temps
    EXCLUDE USING gist (
        grille_id WITH =,
        tstzrange(heure_debut, heure_fin) WITH &&
    )
);

CREATE INDEX idx_emission_grille ON emission(grille_id);
CREATE INDEX idx_emission_horaires ON emission(heure_debut, heure_fin);

-- ==========================================================
-- TABLE : alerte
-- ==========================================================
CREATE TABLE alerte (
    id              BIGSERIAL PRIMARY KEY,
    grille_id       BIGINT NOT NULL REFERENCES grille(id) ON DELETE CASCADE,
    emission_id     BIGINT REFERENCES emission(id) ON DELETE SET NULL,
    destinataire_id BIGINT REFERENCES utilisateur(id) ON DELETE SET NULL,
    type            VARCHAR(40) NOT NULL
                    CHECK (type IN ('modification_derniere_minute', 'grille_incomplete',
                                     'validation', 'synchro_vmix', 'autre')),
    message         TEXT NOT NULL,
    date_envoi      TIMESTAMPTZ NOT NULL DEFAULT now(),
    statut_lecture  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_alerte_destinataire ON alerte(destinataire_id, statut_lecture);

-- ==========================================================
-- TABLE : synchro_vmix (journal des échanges avec la régie)
-- ==========================================================
CREATE TABLE synchro_vmix (
    id              BIGSERIAL PRIMARY KEY,
    grille_id       BIGINT NOT NULL REFERENCES grille(id) ON DELETE CASCADE,
    statut          VARCHAR(20) NOT NULL CHECK (statut IN ('en_attente', 'succes', 'echec')),
    reponse_vmix    JSONB,
    date_synchro    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_synchro_grille ON synchro_vmix(grille_id);