/* ============================================================
   AfficheEmission — la carte-affiche du portail public
   Nouveau fichier : src/components/epg/AfficheEmission.tsx

   Une seule carte sert partout : rails de l'accueil, mosaïque du
   Guide TV, grille Replay. C'est ce qui remplace les rectangles
   du tableau horaire.

   L'affiche est générée en CSS à partir du genre (dégradé + trame)
   plutôt que chargée comme image : Balafon TV n'a pas encore de
   visuel par émission, et un placeholder gris serait pire que rien.
   Dès que `posterUrl` est renseigné côté Django (champ
   `image_affiche` du modèle Emission), il prend le dessus.
   ============================================================ */
import { memo, type CSSProperties } from "react";

import type { Program, ProgramCategory, ScheduleItem } from "../../types";
import { toMinutes } from "../../utils/time";

/* ---------------------------------------------------------------- */

interface Essence {
  nom: string;
  vif: string;
  sombre: string;
}

/** Une teinte par genre — deux émissions voisines ne se ressemblent jamais. */
export const ESSENCES: Record<ProgramCategory | "default", Essence> = {
  news:          { nom: "INFORMATION",    vif: "#e31e24", sombre: "#7a1014" },
  talk:          { nom: "DÉBAT & TALK",   vif: "#f0a92b", sombre: "#7d5209" },
  documentary:   { nom: "MAGAZINE",       vif: "#6aa9f5", sombre: "#123a6b" },
  entertainment: { nom: "DIVERTISSEMENT", vif: "#c86bd8", sombre: "#5c2468" },
  music:         { nom: "MUSIQUE",        vif: "#19b57b", sombre: "#0a5138" },
  sport:         { nom: "SPORT",          vif: "#3fb8d4", sombre: "#0d4e5e" },
  series:        { nom: "SÉRIE",          vif: "#9b7bf0", sombre: "#3f2b7a" },
  culture:       { nom: "CULTURE",        vif: "#19b57b", sombre: "#0a5138" },
  "off-air":     { nom: "HORS ANTENNE",   vif: "#5b7fa8", sombre: "#1b2a3c" },
  default:       { nom: "PROGRAMME",      vif: "#8d97a8", sombre: "#3a4250" },
};

export const essence = (c?: ProgramCategory): Essence =>
  ESSENCES[c ?? "default"] ?? ESSENCES.default;

/** Affiche procédurale : dégradé du genre + trame fine, variée par `graine`. */
export function fondAffiche(categorie: ProgramCategory | undefined, graine = 0): string {
  const e = essence(categorie);
  const angle = 135 + (graine % 5) * 11;
  return [
    `repeating-linear-gradient(${angle + 90}deg, rgba(255,255,255,.045) 0 2px, transparent 2px 13px)`,
    `radial-gradient(90% 68% at ${22 + (graine % 4) * 13}% 12%, ${e.vif}dd, transparent 62%)`,
    `linear-gradient(${angle}deg, ${e.sombre}, #0a0c12 88%)`,
  ].join(",");
}

const hhmm = (m: number) =>
  `${String(Math.floor((((m % 1440) + 1440) % 1440) / 60)).padStart(2, "0")}:${String(
    Math.round(m) % 60
  ).padStart(2, "0")}`;

export const libelleDuree = (m: number) =>
  m >= 60 ? (m % 60 ? `${Math.floor(m / 60)} h ${m % 60}` : `${Math.floor(m / 60)} h`) : `${m} min`;

/* ---------------------------------------------------------------- */

export interface AfficheProps {
  item: ScheduleItem;
  program: Program | undefined;
  /** Horloge injectée (useNow) — une seule source de temps dans l'app. */
  now: Date;
  /** false pour un autre jour que today : ni « direct », ni « passé ». */
  estAujourdhui?: boolean;
  /** Format 16/9 + bouton lecture, pour l'onglet Replay. */
  replay?: boolean;
  /** Ligne secondaire du replay (« Hier · 20:00 »). */
  sousTitre?: string;
  /** Durée affichée en pastille sur un replay. */
  dureeTexte?: string;
  estompe?: boolean;
  onSelect?: (item: ScheduleItem, program: Program | undefined) => void;
}

function AfficheBrute({
  item,
  program,
  now,
  estAujourdhui = true,
  replay = false,
  sousTitre,
  dureeTexte,
  estompe = false,
  onSelect,
}: AfficheProps) {
  const e = essence(program?.category);
  const debut = toMinutes(item.startTime);
  const fin = toMinutes(item.endTime);
  const minutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

  const horsAntenne = program?.category === "off-air";
  const enDirect = !replay && estAujourdhui && !horsAntenne && minutes >= debut && minutes < fin;
  const passe = !replay && estAujourdhui && minutes >= fin;
  const avance = enDirect ? ((minutes - debut) / (fin - debut)) * 100 : 0;

  const graine = Number(item.serverId ?? debut) || debut;
  const titre = program?.title ?? "Programme";

  return (
    <button
      type="button"
      className={[
        "affiche",
        replay && "replay-carte",
        enDirect && "live",
        passe && "passe",
        estompe && "estompe",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={
        replay
          ? `${titre}, replay${dureeTexte ? `, ${dureeTexte}` : ""}, ${e.nom.toLowerCase()}`
          : `${titre}, de ${item.startTime} à ${item.endTime}, ${e.nom.toLowerCase()}${
              enDirect ? ", en direct" : ""
            }`
      }
      onClick={() => onSelect?.(item, program)}
    >
      <span className="cadre">
        <span
          className="fond"
          style={
            program?.posterUrl
              ? { backgroundImage: `url(${program.posterUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
              : ({ background: fondAffiche(program?.category, graine) } as CSSProperties)
          }
        />
        <span className="ombre" />
        {!program?.posterUrl && <span className="mot">{titre}</span>}

        <span className="haut">
          {enDirect ? (
            <span className="mini live">
              <i />
              DIRECT
            </span>
          ) : item.source === "rerun" ? (
            <span className="mini rediff">REDIFF</span>
          ) : (
            <span />
          )}
          <span className="mini g" style={{ color: e.vif, borderColor: `${e.vif}55` }}>
            {e.nom.split(" ")[0]}
          </span>
        </span>

        {replay ? (
          <>
            <span className="lect">
              <span>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="#fff" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </span>
            {dureeTexte && <span className="duree-past">{dureeTexte}</span>}
          </>
        ) : (
          <span className="bas">
            <span className="hh">
              {hhmm(debut)} → {hhmm(fin)}
            </span>
            <span className="dd">{libelleDuree(fin - debut)}</span>
          </span>
        )}

        {enDirect && (
          <span className="prog">
            <i style={{ width: `${avance}%` }} />
          </span>
        )}
      </span>

      <span className="titre-sous">
        <b>{titre}</b>
        <span>{sousTitre ?? e.nom.toLowerCase()}</span>
      </span>
    </button>
  );
}

/* L'affiche ne se redessine qu'au changement de seconde utile :
   sans memo, l'horloge à 1 s repeindrait toutes les cartes du guide. */
export const AfficheEmission = memo(AfficheBrute, (a, b) => {
  const mêmeMinute =
    Math.floor(a.now.getTime() / 15000) === Math.floor(b.now.getTime() / 15000);
  return (
    mêmeMinute &&
    a.item.id === b.item.id &&
    a.program?.id === b.program?.id &&
    a.estompe === b.estompe &&
    a.estAujourdhui === b.estAujourdhui
  );
});
