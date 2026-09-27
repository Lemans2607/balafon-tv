/* ============================================================
   BalafonIntro — animation d'ouverture
   Nouveau fichier : src/components/intro/BalafonIntro.tsx

   Une seule séquence, 1,5 s, jouée une fois par session : les
   cinq lames du sigle Balafon sont frappées l'une après l'autre,
   comme on accorde un balafon avant l'antenne, puis le rideau se
   lève sur l'application.

   Volontairement sobre : pas de rejeu à chaque navigation
   (sessionStorage), pas d'animation si l'utilisateur a demandé
   moins de mouvement, et le contenu réel est monté DERRIÈRE le
   rideau — l'intro n'ajoute donc aucun temps d'attente.
   ============================================================ */
import { useEffect, useState } from "react";

const LAMES = [
  { h: 46, c: "#e31e24", d: 0.0 },
  { h: 68, c: "#e31e24", d: 0.09 },
  { h: 92, c: "#c8873a", d: 0.18 },
  { h: 70, c: "#c8873a", d: 0.27 },
  { h: 50, c: "#0f6bd6", d: 0.36 },
];

const CLE = "balafon.intro.vue";

export function BalafonIntro() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    if (sessionStorage.getItem(CLE)) return false;
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (!visible) return;
    sessionStorage.setItem(CLE, "1");
    // Le rideau s'efface par CSS ; on démonte juste après pour
    // libérer la couche et rendre le focus au contenu.
    const t = window.setTimeout(() => setVisible(false), 1700);
    return () => window.clearTimeout(t);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="intro" role="status" aria-label="Ouverture de l'antenne">
      <div>
        <div className="intro__lames" aria-hidden="true">
          {LAMES.map((l, i) => (
            <span
              key={i}
              className="intro__lame"
              style={{ height: l.h, background: l.c, animationDelay: `${l.d}s` }}
            />
          ))}
        </div>
        <p className="intro__nom">
          Balafon + Guide
          <small>OUVERTURE D'ANTENNE</small>
        </p>
      </div>
    </div>
  );
}
