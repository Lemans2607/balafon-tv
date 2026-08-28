import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Clock3, ExternalLink, FileEdit, Send, ShieldAlert, Undo2 } from "lucide-react";
import { useAppStore } from "../../store/appStore";
import { useScheduleStore } from "../../store/scheduleStore";
import { useAlertStore } from "../../store/alertStore";
import { Badge, Button, ProgressBar } from "../../components/ui";
import { STATUS_META, type GridInfo, type GridStatus } from "../../types";
import { ADMIN_DAY_START, DAY_END, durationLabel, labelDay } from "../../utils/time";
import { validateGridForPublish } from "../../utils/validation";
import { USERS } from "../../data/schedules";

const COLUMNS: Array<{ id: GridStatus; title: string; hint: string }> = [
  { id: "draft", title: "Brouillons", hint: "Grilles en construction par l’Admin" },
  { id: "pending", title: "En attente de validation", hint: "Soumises au Directeur d’Antenne" },
  { id: "validated", title: "Validées pour diffusion", hint: "Publiées sur le portail public" },
];

/* ============================================================
   DIRECTEUR — Validation éditoriale (Kanban)
   ============================================================ */
export function DirecteurKanban() {
  const role = useAppStore((s) => s.role);
  const toast = useAppStore((s) => s.toast);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const grids = useScheduleStore((s) => s.grids);
  const scheduleMap = useScheduleStore((s) => s.scheduleMap);
  const programs = useScheduleStore((s) => s.programs);
  const setGridStatus = useScheduleStore((s) => s.setGridStatus);
  const alerts = useAlertStore((s) => s.alerts);
  const addAlert = useAlertStore((s) => s.addAlert);
  const navigate = useNavigate();
  const [dragOver, setDragOver] = useState<GridStatus | null>(null);

  const isDirector = role === "directeur";
  const user = isDirector ? USERS.directeur : USERS.admin;

  const dates = useMemo(() => Object.keys(grids).sort(), [grids]);

  const cardData = (date: string) => {
    const items = scheduleMap[date] ?? [];
    const real = items.filter((i) => i.programId !== "p-offair");
    const verdict = validateGridForPublish(items, programs, grids[date].status, ADMIN_DAY_START, DAY_END);
    const covered = real.reduce((acc, i) => {
      const [sh, sm] = i.startTime.split(":").map(Number);
      const [eh, em] = i.endTime.split(":").map(Number);
      return acc + Math.max(0, eh * 60 + em - (sh * 60 + sm));
    }, 0);
    return {
      grid: grids[date],
      count: real.length,
      covered,
      verdict,
      alertCount: alerts.filter((a) => !a.acknowledged && (a.relatedScheduleId === date)).length,
    };
  };

  const validate = (date: string) => {
    const d = cardData(date);
    if (d.verdict.gaps.length > 0) {
      toast({ title: "Validation impossible", message: `Grille du ${date} incomplète : ${d.verdict.gaps.length} trou(s) à combler.`, tone: "error" });
      return;
    }
    setGridStatus({ date, status: "validated", user: user.name, role: "directeur", note: `Grille du ${date} validée pour diffusion par ${user.name}.` });
    addAlert({
      severity: "info",
      title: `Grille du ${date} validée`,
      message: `Validée par ${user.name}. La Régie peut synchroniser vMix ; le portail public diffuse cette version.`,
      source: "director",
      relatedScheduleId: date,
    });
    toast({ title: "Grille validée", message: `La grille du ${date} est publiée sur le portail public Balafon TV.`, tone: "success" });
  };

  const submit = (date: string) => {
    setGridStatus({ date, status: "pending", user: user.name, role: isDirector ? "directeur" : "admin" });
    toast({ title: "Grille soumise", message: `La grille du ${date} est en attente de validation.`, tone: "info" });
  };

  const reject = (date: string) => {
    setGridStatus({ date, status: "draft", user: user.name, role: "directeur", note: `Grille du ${date} refusée — retour en brouillon.` });
    toast({ title: "Grille refusée", message: `La grille du ${date} repasse en brouillon.`, tone: "warning" });
  };

  const onDropColumn = (status: GridStatus, e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const date = e.dataTransfer.getData("text/balafon-grid");
    if (!date || grids[date]?.status === status) return;
    if (status === "validated") {
      if (!isDirector) {
        toast({ title: "Action réservée", message: "Seul le Directeur d’Antenne peut valider une grille.", tone: "warning" });
        return;
      }
      validate(date);
    } else if (status === "pending") submit(date);
    else reject(date);
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <p className="text-[13px] text-mist">
          Workflow éditorial : l’Admin construit, le <strong className="text-paper">Directeur d’Antenne</strong> valide, la Régie diffuse.
        </p>
        {!isDirector && (
          <Badge color="#FFB800" soft="rgba(255,184,0,0.14)">
            Lecture seule — rôle {role}
          </Badge>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const colDates = dates.filter((d) => grids[d].status === col.id);
          return (
            <section
              key={col.id}
              aria-label={col.title}
              onDragOver={(e) => { e.preventDefault(); setDragOver(col.id); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => onDropColumn(col.id, e)}
              className={`rounded-2xl border bg-ink-800/50 p-3.5 transition-colors ${
                dragOver === col.id ? "border-balafon/60 bg-balafon/5" : "border-ink-700"
              }`}
            >
              <header className="mb-3 flex items-center justify-between px-1">
                <div>
                  <h2 className="font-display text-[14.5px] font-extrabold text-paper">{col.title}</h2>
                  <p className="text-[10.5px] text-mist-dark">{col.hint}</p>
                </div>
                <span className="rounded-lg bg-ink-700 px-2 py-1 font-mono text-[12px] font-bold text-mist">{colDates.length}</span>
              </header>
              <div className="space-y-3">
                {colDates.map((date) => {
                  const d = cardData(date);
                  const meta = STATUS_META[d.grid.status];
                  return (
                    <motion.article
                      key={date}
                      layout
                      layoutId={`grid-${date}`}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      draggable={isDirector}
                      onDragStart={(e) => {
                        const ev = e as unknown as React.DragEvent;
                        ev.dataTransfer.setData("text/balafon-grid", date);
                      }}
                      className={`rounded-xl border border-ink-600 bg-ink-800 p-4 transition-shadow hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)] ${isDirector ? "cursor-grab active:cursor-grabbing" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-display text-[15px] font-extrabold text-paper">{labelDay(date)}</h3>
                          <p className="font-mono text-[10.5px] text-mist-dark">{date}</p>
                        </div>
                        <Badge color={meta.color} soft={meta.soft}>{d.grid.status === "validated" ? "Validée" : meta.label}</Badge>
                      </div>

                      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg bg-ink-900 px-1 py-1.5">
                          <dt className="text-[9px] font-bold uppercase tracking-wider text-mist-dark">Programmes</dt>
                          <dd className="font-mono text-[13px] font-bold text-paper">{d.count}</dd>
                        </div>
                        <div className="rounded-lg bg-ink-900 px-1 py-1.5">
                          <dt className="text-[9px] font-bold uppercase tracking-wider text-mist-dark">Couverture</dt>
                          <dd className="font-mono text-[13px] font-bold text-paper">{durationLabel(d.covered)}</dd>
                        </div>
                        <div className="rounded-lg bg-ink-900 px-1 py-1.5">
                          <dt className="text-[9px] font-bold uppercase tracking-wider text-mist-dark">Complétude</dt>
                          <dd className={`font-mono text-[13px] font-bold ${d.verdict.coverage === 100 ? "text-studio" : "text-crit"}`}>{d.verdict.coverage} %</dd>
                        </div>
                      </dl>
                      <div className="mt-2">
                        <ProgressBar value={d.verdict.coverage} color={d.verdict.coverage === 100 ? "#00F5A0" : "#EF4444"} />
                      </div>

                      <p className="mt-2.5 text-[10.5px] text-mist-dark">
                        Auteur : {d.grid.author} · modifiée {d.grid.updatedAt.slice(0, 16).replace("T", " à ")}
                        {d.alertCount > 0 && <span className="ml-1 font-bold text-crit">· {d.alertCount} alerte(s)</span>}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {d.grid.status === "draft" && (
                          <Button size="sm" variant="outline" onClick={() => submit(date)}>
                            <Send size={12} aria-hidden /> Soumettre
                          </Button>
                        )}
                        {d.grid.status === "pending" && isDirector && (
                          <>
                            <Button size="sm" variant="green" onClick={() => validate(date)}>
                              <CheckCircle2 size={12} aria-hidden /> Valider
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => reject(date)}>
                              <Undo2 size={12} aria-hidden /> Refuser
                            </Button>
                          </>
                        )}
                        {d.grid.status === "pending" && !isDirector && (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-mist-dark">
                            <Clock3 size={11} aria-hidden /> En attente du Directeur
                          </span>
                        )}
                        {d.grid.status === "validated" && (
                          <span className="flex items-center gap-1 text-[11px] font-extrabold text-studio">
                            <CheckCircle2 size={12} aria-hidden /> Publiée sur le portail
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedDate(date);
                            navigate("/studio/admin");
                          }}
                          title="Ouvrir dans le constructeur"
                        >
                          <FileEdit size={12} aria-hidden /> Ouvrir
                        </Button>
                        <Link to="/tv/guide" className="ml-auto self-center text-mist-dark transition-colors hover:text-balafon" aria-label="Voir sur le portail public">
                          <ExternalLink size={13} />
                        </Link>
                      </div>
                    </motion.article>
                  );
                })}
                {colDates.length === 0 && (
                  <p className="rounded-xl border border-dashed border-ink-600 px-4 py-8 text-center text-[12px] text-mist-dark">
                    Aucune grille {col.title.toLowerCase()}.
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-ink-700 bg-ink-800/60 p-4">
        <ShieldAlert size={16} className="mt-0.5 shrink-0 text-goldwarn" aria-hidden />
        <p className="text-[12.5px] leading-relaxed text-mist">
          Si une grille <strong className="text-paper">validée</strong> est modifiée dans le constructeur, une modale rouge impose une
          confirmation : une alerte critique part immédiatement vers la <Link className="font-bold text-balafon" to="/studio/regie">Régie</Link>{" "}
          avec action vMix requise, et un journal d’audit est tracé.
          <ArrowRight size={12} className="ml-1 inline" aria-hidden />
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   /studio/grilles — vue tabulaire des grilles
   ============================================================ */
export function GridsPage() {
  const grids = useScheduleStore((s) => s.grids);
  const scheduleMap = useScheduleStore((s) => s.scheduleMap);
  const programs = useScheduleStore((s) => s.programs);
  const dates = useMemo(() => Object.keys(grids).sort(), [grids]);

  return (
    <div className="overflow-x-auto rounded-2xl border border-ink-700 bg-ink-800/70">
      <table className="w-full min-w-[720px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-ink-700 text-[10.5px] uppercase tracking-widest text-mist-dark">
            <th className="px-4 py-3">Grille</th>
            <th className="px-4 py-3">Statut</th>
            <th className="px-4 py-3">Programmes</th>
            <th className="px-4 py-3">Complétude (06–24 h)</th>
            <th className="px-4 py-3">Auteur</th>
            <th className="px-4 py-3">Dernière modification</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-700">
          {dates.map((date) => {
            const items = scheduleMap[date] ?? [];
            const real = items.filter((i) => i.programId !== "p-offair");
            const verdict = validateGridForPublish(items, programs, grids[date].status, ADMIN_DAY_START, DAY_END);
            const meta = STATUS_META[grids[date].status];
            return (
              <tr key={date} className="transition-colors hover:bg-ink-700/40">
                <td className="px-4 py-3">
                  <span className="font-extrabold text-paper">{labelDay(date)}</span>
                  <span className="ml-2 font-mono text-[11px] text-mist-dark">{date}</span>
                </td>
                <td className="px-4 py-3"><Badge color={meta.color} soft={meta.soft}>{meta.label}</Badge></td>
                <td className="px-4 py-3 font-mono text-mist">{real.length}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-28"><ProgressBar value={verdict.coverage} color={verdict.coverage === 100 ? "#00F5A0" : "#EF4444"} /></div>
                    <span className={`font-mono text-[11.5px] font-bold ${verdict.coverage === 100 ? "text-studio" : "text-crit"}`}>
                      {verdict.coverage} %{verdict.gaps.length > 0 ? ` · ${verdict.gaps.length} trou(s)` : ""}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-mist">{grids[date].author}</td>
                <td className="px-4 py-3 font-mono text-[11.5px] text-mist-dark">{grids[date].updatedAt.slice(0, 16).replace("T", " ")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
