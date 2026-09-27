/* ============================================================
   TiroirSynopsis — la fiche qui s'ouvre au clic sur une émission
   Nouveau fichier : src/components/epg/TiroirSynopsis.tsx

   Un seul tiroir pour toute l'application : l'accueil, le Guide TV
   et le Replay l'ouvrent avec `useTiroir.getState().ouvrir(...)`.
   Monté une fois dans App.tsx, jamais dupliqué par page.

   Accessibilité : rôle dialog, fermeture à Échap et au clic sur le
   voile, focus déplacé dans le tiroir à l'ouverture et rendu à
   l'élément déclencheur à la fermeture, piège à focus sur Tab.
   ============================================================ */
import { useCallback, useEffect, useRef } from "react";
import { create } from "zustand";

import type { Program, ScheduleItem } from "../../types";
import { toMinutes } from "../../utils/time";
import { useNow } from "../../hooks/useNow";
import { essence, fondAffiche, libelleDuree } from "./AfficheEmission";

/* ------------------------------------------------------------------ */
/*  État partagé                                                       */
/* ------------------------------------------------------------------ */

export interface ContenuTiroir {
  item: ScheduleItem;
  program: Program | undefined;
  /** "grille" : horaires + rappel · "replay" : date de diffusion + lecture. */
  mode: "grille" | "replay";
  sousTitre?: string;
  dureeTexte?: string;
  vues?: string;
}

interface EtatTiroir {
  contenu: ContenuTiroir | null;
  ouvrir: (c: ContenuTiroir) => void;
  fermer: () => void;
}

export const useTiroir = create<EtatTiroir>((set) => ({
  contenu: null,
  ouvrir: (contenu) => set({ contenu }),
  fermer: () => set({ contenu: null }),
}));

/* ------------------------------------------------------------------ */

const hhmm = (m: number) =>
  `${String(Math.floor((((m % 1440) + 1440) % 1440) / 60)).padStart(2, "0")}:${String(
    Math.round(m) % 60
  ).padStart(2, "0")}`;

export function TiroirSynopsis() {
  const contenu = useTiroir((s) => s.contenu);
  const fermer = useTiroir((s) => s.fermer);
  const now = useNow(1000);

  const panneau = useRef<HTMLElement>(null);
  const declencheur = useRef<HTMLElement | null>(null);

  /* Mémorise l'élément qui avait le focus, le rend à la fermeture. */
  useEffect(() => {
    if (contenu) {
      declencheur.current = document.activeElement as HTMLElement;
      panneau.current?.focus();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      declencheur.current?.focus();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [contenu]);

  /* Échap ferme ; Tab reste prisonnier du tiroir. */
  const surTouche = useCallback(
    (e: KeyboardEvent) => {
      if (!contenu) return;
      if (e.key === "Escape") {
        fermer();
        return;
      }
      if (e.key !== "Tab" || !panneau.current) return;
      const cibles = panneau.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (cibles.length === 0) return;
      const premier = cibles[0];
      const dernier = cibles[cibles.length - 1];
      if (e.shiftKey && document.activeElement === premier) {
        e.preventDefault();
        dernier.focus();
      } else if (!e.shiftKey && document.activeElement === dernier) {
        e.preventDefault();
        premier.focus();
      }
    },
    [contenu, fermer]
  );

  useEffect(() => {
    document.addEventListener("keydown", surTouche);
    return () => document.removeEventListener("keydown", surTouche);
  }, [surTouche]);

  const item = contenu?.item;
  const program = contenu?.program;
  const e = essence(program?.category);

  const debut = item ? toMinutes(item.startTime) : 0;
  const fin = item ? toMinutes(item.endTime) : 0;
  const minutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const enDirect =
    !!item && contenu?.mode === "grille" && minutes >= debut && minutes < fin;
  const avance = enDirect ? ((minutes - debut) / (fin - debut)) * 100 : 0;

  return (
    <>
      <div
        className={`voile-t${contenu ? " on" : ""}`}
        onClick={fermer}
        aria-hidden="true"
      />

      <aside
        ref={panneau}
        className={`tiroir${contenu ? " on" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tiroir-titre"
        aria-hidden={!contenu}
        tabIndex={-1}
      >
        {contenu && item && (
          <>
            <button type="button" className="fermer" onClick={fermer} aria-label="Fermer la fiche">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>

            <div
              className="visuel"
              style={
                program?.posterUrl
                  ? { backgroundImage: `url(${program.posterUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                  : { background: fondAffiche(program?.category, Number(item.serverId ?? debut) || debut) }
              }
            >
              {!program?.posterUrl && <span className="mot">{program?.title}</span>}
              <span className="vo" />
            </div>

            <div className="corps">
              <div className="etiqs">
                {enDirect && (
                  <span className="mini live">
                    <i />
                    EN DIRECT
                  </span>
                )}
                <span className="mini g" style={{ color: e.vif, borderColor: `${e.vif}55` }}>
                  {e.nom}
                </span>
                {item.source === "rerun" && <span className="mini rediff">REDIFFUSION</span>}
                {program?.fiabilite === "estime" && (
                  <span className="mini rediff" style={{ color: "#f0a92b", borderColor: "#f0a92b55" }}>
                    HORAIRE ESTIMÉ
                  </span>
                )}
              </div>

              <h3 id="tiroir-titre">{program?.title}</h3>

              <div className="ligne-m">
                {contenu.mode === "replay" ? (
                  <>
                    {contenu.sousTitre && <span>{contenu.sousTitre}</span>}
                    {contenu.dureeTexte && <span>{contenu.dureeTexte}</span>}
                    {contenu.vues && <span>{contenu.vues} vues</span>}
                  </>
                ) : (
                  <>
                    <span>
                      {hhmm(debut)} → {hhmm(fin)}
                    </span>
                    <span>{libelleDuree(fin - debut)}</span>
                  </>
                )}
              </div>

              {enDirect && (
                <div className="avance-t">
                  <div className="b">
                    <i style={{ width: `${avance}%` }} />
                  </div>
                  <div className="s">
                    <span>{Math.round(avance)} % écoulé</span>
                    <span>{libelleDuree(Math.ceil(fin - minutes))} restantes</span>
                  </div>
                </div>
              )}

              <h4>SYNOPSIS</h4>
              <p className="syn">
                {program?.description?.trim() ||
                  "Le synopsis de cette émission n'a pas encore été renseigné par la Direction d'Antenne."}
              </p>

              <h4>FICHE TECHNIQUE</h4>
              <dl className="fiche">
                <dt>Genre</dt>
                <dd>{e.nom.toLowerCase()}</dd>
                <dt>Créneau</dt>
                <dd>
                  {hhmm(debut)} → {hhmm(fin)}
                </dd>
                <dt>Durée</dt>
                <dd>{libelleDuree(fin - debut)}</dd>
                <dt>Horaire</dt>
                <dd>
                  {program?.fiabilite === "estime"
                    ? "estimé — à confirmer par la régie"
                    : "confirmé par la régie"}
                </dd>
                <dt>Replay</dt>
                <dd>{program?.isReplayAvailable ? "disponible 7 jours" : "non disponible"}</dd>
              </dl>

              <div className="btns">
                {enDirect && (
                  <button type="button" className="cta p">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff" aria-hidden>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Regarder le direct
                  </button>
                )}
                {contenu.mode === "replay" && (
                  <button type="button" className="cta p">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff" aria-hidden>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Lancer le replay
                  </button>
                )}
                {!enDirect && contenu.mode === "grille" && program?.category !== "off-air" && (
                  <button type="button" className="cta s">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" aria-hidden>
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </svg>
                    Me le rappeler
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
