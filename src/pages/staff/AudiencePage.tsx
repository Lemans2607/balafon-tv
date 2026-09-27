/* ============================================================
   AudiencePage — « qui regarde quoi, maintenant »
   Nouveau fichier. Route : /studio/audience (voir App.tsx, StaffShell.tsx)

   Répond aux deux demandes de la Direction d'Antenne :
     • combien d'écrans suivent l'émission en cours ;
     • pour chaque émission, laquelle est la plus écoutée.

   Données : GET /api/audience/direct/ (public, rafraîchi 10 s),
   GET /api/audience/classement/ (réservé aux comptes),
   GET /api/audience/courbe/{id}/ — la nouvelle app Django `audience`.

   Un seul graphique pour la tendance, un classement trié pour la
   décision — rien de décoratif. Suit le même habillage que
   GenreChart.tsx (thème clair/sombre, JetBrains Mono).
   ============================================================ */
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Radio, TrendingUp, Users } from "lucide-react";

import { Card, EmptyState, SectionTitle } from "../../components/ui";
import { useThemeStore } from "../../store/themeStore";
import { isBackendConfigured } from "../../services/backend";
import {
  useAudienceClassement,
  useAudienceCourbe,
  useAudienceDirect,
} from "../../hooks/useAudience";

const PERIODES = [
  { j: 1, libelle: "24 heures" },
  { j: 7, libelle: "7 jours" },
  { j: 30, libelle: "30 jours" },
];

export function AudiencePage() {
  const [jours, setJours] = useState(7);
  const [selection, setSelection] = useState<number | null>(null);
  const theme = useThemeStore((s) => s.theme);
  const backendActif = isBackendConfigured();

  const direct = useAudienceDirect();
  const classement = useAudienceClassement(jours);
  const lignes = classement.data?.etat === "ok" ? classement.data.donnees : [];
  const idCourbe = selection ?? lignes[0]?.emission_id ?? null;
  // Appelé inconditionnellement (règle des Hooks) : la requête elle-même
  // reste inactive (`enabled: false`) tant que idCourbe est null.
  const courbe = useAudienceCourbe(idCourbe, jours * 24);

  if (!backendActif) {
    return (
      <div className="space-y-6">
        <SectionTitle kicker="Direction d'antenne" title="Audience" accent="#00F5A0" />
        <EmptyState
          icon={<TrendingUp size={28} />}
          title="Mesure d'audience indisponible en mode démo"
          hint="Renseignez VITE_API_URL dans .env.local et connectez le backend Django pour voir les écrans connectés et le classement des émissions."
        />
      </div>
    );
  }

  const donneesDirectes = direct.data?.etat === "ok" ? direct.data.donnees : null;
  const maxMoyenne = Math.max(1, ...lignes.map((l) => l.spectateurs_moyens));
  const serie = courbe.data?.etat === "ok" ? courbe.data.donnees : [];
  const titreCourbe = lignes.find((l) => l.emission_id === idCourbe)?.titre ?? "—";

  const light = theme === "light";
  const axe = light ? "#556072" : "#8b94a5";
  const grille = light ? "#e2e5ec" : "#1b2130";

  return (
    <div className="space-y-6">
      <SectionTitle
        kicker="Direction d'antenne"
        title="Audience"
        accent="#00F5A0"
        right={
          <p className="max-w-xs text-right text-[11.5px] text-mist-dark">
            Écrans connectés au portail public — pas une mesure d'audience télévisuelle.
          </p>
        }
      />

      {/* ── bandeau direct ──────────────────────────────────────── */}
      <Card className="relative overflow-hidden border-balafon/30 !bg-gradient-to-r !from-balafon/10 !to-transparent p-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="flex items-center gap-2 text-[11.5px] font-extrabold uppercase tracking-wide text-balafon-soft">
              <Radio size={13} className="animate-pulse" />
              À l'antenne en ce moment
            </p>
            <p className="font-display mt-1.5 text-[28px] font-black uppercase leading-none text-paper">
              {donneesDirectes?.titre ?? "—"}
            </p>
            {donneesDirectes?.emission_id != null && donneesDirectes.depuis && (
              <p className="mt-1.5 font-mono text-[12px] text-mist">
                Depuis{" "}
                {new Date(donneesDirectes.depuis).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>

          <div className="flex gap-9 text-right">
            <div>
              <p className="flex items-center justify-end gap-1.5 font-mono text-[32px] font-bold leading-none tabular-nums text-paper">
                <Users size={20} className="text-studio" />
                {(donneesDirectes?.spectateurs ?? 0).toLocaleString("fr-FR")}
              </p>
              <p className="mt-1.5 text-[11px] text-mist-dark">écrans connectés</p>
            </div>
            <div>
              <p className="font-mono text-[32px] font-bold leading-none tabular-nums text-mist">
                {(donneesDirectes?.pic_du_jour ?? 0).toLocaleString("fr-FR")}
              </p>
              <p className="mt-1.5 text-[11px] text-mist-dark">pic sur 24 h</p>
            </div>
          </div>
        </div>

        {direct.data?.etat === "injoignable" && (
          <p className="mt-4 rounded-lg border border-goldwarn/40 bg-goldwarn/10 px-3.5 py-2.5 text-[12.5px] text-goldwarn">
            Mesure indisponible — {direct.data.raison}
          </p>
        )}
      </Card>

      {/* ── sélecteur de période ────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] text-mist">Classement sur</span>
        {PERIODES.map((p) => (
          <button
            key={p.j}
            type="button"
            aria-pressed={jours === p.j}
            onClick={() => setJours(p.j)}
            className={`rounded-full border px-4 py-1.5 text-[12.5px] font-bold transition-colors ${
              jours === p.j
                ? "border-studio bg-studio/15 text-studio"
                : "border-ink-600 bg-ink-800/60 text-mist hover:border-studio/40 hover:text-paper"
            }`}
          >
            {p.libelle}
          </button>
        ))}
      </div>

      {/* ── courbe ─────────────────────────────────────────────── */}
      <Card>
        <p className="text-[13.5px] font-bold text-paper">Audience de « {titreCourbe} »</p>
        <p className="mb-4 text-[11.5px] text-mist-dark">
          Un point toutes les 5 minutes, relevé par <code>manage.py releve_audience</code>.
        </p>

        {serie.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-mist">
            Aucun relevé sur la période. Lancez la tâche planifiée pour commencer à mesurer.
          </p>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={serie} margin={{ top: 6, right: 10, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="grad-audience" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00F5A0" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#00F5A0" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={grille} vertical={false} />
                <XAxis
                  dataKey="instant"
                  tickFormatter={(v: string) =>
                    new Date(v).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
                  }
                  tick={{ fill: axe, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
                  minTickGap={40}
                  axisLine={{ stroke: grille }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: axe, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: light ? "#ffffff" : "#121724",
                    border: `1px solid ${light ? "#e2e5ec" : "#2b3345"}`,
                    borderRadius: 10,
                    fontSize: 12,
                    color: light ? "#131822" : "#f7f8fa",
                  }}
                  labelFormatter={(v: string) => new Date(v).toLocaleString("fr-FR")}
                  formatter={(v: number) => [`${v} écrans`, "Audience"]}
                />
                <Area type="monotone" dataKey="spectateurs" stroke="#00F5A0" strokeWidth={2} fill="url(#grad-audience)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* ── classement ─────────────────────────────────────────── */}
      <Card className="!p-0 overflow-hidden">
        <div className="border-b border-ink-700 px-5 py-4">
          <p className="text-[13.5px] font-bold text-paper">Les émissions les plus suivies</p>
          <p className="text-[11.5px] text-mist-dark">
            Cliquez une ligne pour afficher sa courbe. Le taux d'écoute complète indique la
            proportion de l'émission réellement regardée.
          </p>
        </div>

        {lignes.length === 0 ? (
          <p className="px-5 py-10 text-center text-[13px] text-mist">
            {classement.data?.etat === "vide"
              ? "Aucune donnée d'audience sur la période."
              : classement.isPending
                ? "Chargement du classement…"
                : "Classement indisponible."}
          </p>
        ) : (
          <ul className="divide-y divide-ink-700">
            {lignes.map((l, i) => (
              <li key={l.emission_id}>
                <button
                  type="button"
                  onClick={() => setSelection(l.emission_id)}
                  aria-current={idCourbe === l.emission_id}
                  className={`grid w-full grid-cols-[28px_1fr_auto] items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-white/[0.03] ${
                    idCourbe === l.emission_id ? "bg-white/[0.04]" : ""
                  }`}
                >
                  <span className="font-mono text-[13px] tabular-nums text-mist-dark">{i + 1}</span>

                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-bold text-paper">{l.titre}</span>
                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-ink-600">
                      <span
                        className="block h-full rounded-full bg-studio"
                        style={{ width: `${(l.spectateurs_moyens / maxMoyenne) * 100}%` }}
                      />
                    </span>
                    <span className="mt-1 block text-[11px] text-mist-dark">
                      {l.genre} · écoute complète {l.taux_completion} % · durée moyenne vue{" "}
                      {Math.round(l.duree_moyenne_vue_s / 60)} min
                    </span>
                  </span>

                  <span className="text-right">
                    <span className="block font-mono text-[16px] font-bold tabular-nums text-paper">
                      {l.spectateurs_moyens.toLocaleString("fr-FR")}
                    </span>
                    <span className="block text-[10.5px] text-mist-dark">
                      pic {l.pic.toLocaleString("fr-FR")}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
