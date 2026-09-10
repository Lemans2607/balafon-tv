import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, CalendarDays, Clock3, Database, GripVertical, Search, Send, ShieldAlert, Upload } from "lucide-react";
import { useAppStore } from "../../store/appStore";
import { useAuth } from "../../context/AuthContext";
import { useScheduleStore } from "../../store/scheduleStore";
import { useAlertStore } from "../../store/alertStore";
import { useVmixStore } from "../../store/vmixStore";
import { useNow } from "../../hooks/useNow";
import { BalafonEpg } from "../../components/planby/BalafonEpg";
import type { PlanbyEpgData } from "../../components/planby/planbyMappers";
import { Badge, Button, DaySelector, Modal } from "../../components/ui";
import { GrilleCalendar } from "../../components/calendar/GrilleCalendar";
import { ProgramPoster } from "../../components/media/ProgramPoster";
import { CATEGORY_META, STATUS_META, type Program, type ScheduleItem } from "../../types";
import { ADMIN_DAY_START, DAY_END, durationLabel, toHHMM, toMinutes } from "../../utils/time";
import { validateGridForPublish } from "../../utils/validation";
import { USERS } from "../../data/schedules";
import { backendConfigure } from "../../api/client";
import { enregistrerEmissionPlanifiee } from "../../api/grille";

/* ============================================================
   ADMIN — Constructeur de grille EPG
   Bibliothèque draggable (HTML5 DnD) → timeline Planby.
   Détection de trous & contrôle de complétude hors Planby.
   ============================================================ */
export function AdminBuilder() {
  const { role } = useAuth();
  const selectedDate = useAppStore((s) => s.selectedDate);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const toast = useAppStore((s) => s.toast);
  const programs = useScheduleStore((s) => s.programs);
  const scheduleMap = useScheduleStore((s) => s.scheduleMap);
  const grids = useScheduleStore((s) => s.grids);
  const dataSource = useScheduleStore((s) => s.source);
  const addScheduleItem = useScheduleStore((s) => s.addScheduleItem);
  const removeScheduleItem = useScheduleStore((s) => s.removeScheduleItem);
  const setGridStatus = useScheduleStore((s) => s.setGridStatus);
  const addLog = useScheduleStore((s) => s.addLog);
  const addAlert = useAlertStore((s) => s.addAlert);
  const sendChange = useVmixStore((s) => s.sendChange);
  const now = useNow(1000);
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [pendingDrop, setPendingDrop] = useState<{ programId: string; startMin: number } | null>(null);
  const [pendingRemove, setPendingRemove] = useState<ScheduleItem | null>(null);
  const [picker, setPicker] = useState<{ open: boolean; startMin: number; endMin: number }>({ open: false, startMin: 0, endMin: 0 });

  if (role !== "directeur_antenne") {
    return (
      <div className="rounded-2xl border border-goldwarn/40 bg-goldwarn/8 p-8 text-center">
        <ShieldAlert size={28} className="mx-auto text-goldwarn" aria-hidden />
        <h1 className="font-display mt-3 text-xl font-extrabold text-paper">Accès réservé — Direction d’Antenne</h1>
        <p className="mx-auto mt-2 max-w-md text-[13.5px] text-mist">
          Le constructeur de grille est opéré par le Directeur d’Antenne (administrateur de la plateforme).
          Connectez-vous avec un compte Direction pour y accéder.
        </p>
        <Button className="mt-5" onClick={() => navigate("/login")}>Se connecter</Button>
      </div>
    );
  }

  const user = USERS.directeur;
  const grid = grids[selectedDate];
  const gridStatus = grid?.status ?? "draft";
  const items = scheduleMap[selectedDate] ?? [];
  const verdict = validateGridForPublish(items, programs, gridStatus, ADMIN_DAY_START, DAY_END);
  const isValidated = gridStatus === "validated";

  const library = useMemo(() => {
    const q = query.trim().toLowerCase();
    return programs.filter(
      (p) =>
        p.category !== "off-air" &&
        (catFilter === "all" || p.category === catFilter) &&
        (q === "" || p.title.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }, [programs, query, catFilter]);

  /* ---------- handleProgramDrop : règle d'ajout unique ---------- */
  const handleProgramDrop = ({ programId, targetTime }: { programId: string; targetTime: number }) => {
    if (isValidated) {
      setPendingDrop({ programId, startMin: targetTime });
      return;
    }
    applyAdd(programId, targetTime);
  };

  const applyAdd = (programId: string, startMin: number, silentCritical = false) => {
    const program = programs.find((p) => p.id === programId);
    const endMin = startMin + (program?.durationMinutes ?? 0);
    const collision = items.find((item) => {
      const itemStart = toMinutes(item.startTime);
      const itemEnd = toMinutes(item.endTime);
      return startMin < itemEnd && itemStart < endMin;
    });
    if (collision) {
      const collisionProgram = programs.find((p) => p.id === collision.programId);
      toast({
        title: "Dépôt refusé",
        message: `Impossible de planifier ici : chevauchement avec ${collisionProgram?.title ?? "un programme existant"}.`,
        tone: "error",
      });
      return null;
    }
    const res = addScheduleItem({ programId, date: selectedDate, startMin, user: user.name, role: "directeur" });
    if (!res.ok) {
      toast({ title: "Dépôt refusé", message: res.error, tone: "error" });
      return null;
    }
    if (!silentCritical) {
      toast({
        title: "Programme ajouté à la grille",
        message: `« ${program?.title} » planifié de ${toHHMM(startMin)} à ${res.item!.endTime}.`,
        tone: "success",
        action: {
          label: "Annuler",
          onClick: () => {
            removeScheduleItem({ itemId: res.item!.id, date: selectedDate, user: user.name, role: "directeur" });
            toast({ title: "Ajout annulé", message: `« ${program?.title} » a été retiré de la grille.`, tone: "info" });
          },
        },
      });
    }
    if (backendConfigure() && res.item && program) {
      void enregistrerEmissionPlanifiee({
        date: selectedDate,
        startTime: res.item.startTime,
        endTime: res.item.endTime,
        title: program.title,
        description: program.description,
        category: program.category,
        posterUrl: program.posterUrl,
        fiabilite: program.fiabilite,
      }).catch((error: unknown) => {
        console.error("[BALAFON + GUIDE] Échec de sauvegarde backend :", error);
        toast({
          title: "Sauvegarde backend échouée",
          message: "La grille reste visible localement. Vérifiez la connexion et vos droits Django.",
          tone: "error",
        });
      });
    }
    return res.item!;
  };

  const handleRemove = (scheduleId: string) => {
    const item = items.find((i) => i.id === scheduleId);
    if (!item) return;
    if (isValidated) {
      setPendingRemove(item);
      return;
    }
    const program = programs.find((p) => p.id === item.programId);
    removeScheduleItem({ itemId: scheduleId, date: selectedDate, user: user.name, role: "directeur" });
    toast({
      title: "Programme retiré",
      message: `« ${program?.title} » (${item.startTime}–${item.endTime}) retiré de la grille.`,
      tone: "warning",
      action: {
        label: "Annuler",
        onClick: () => {
          addScheduleItem({
            programId: item.programId,
            date: selectedDate,
            startMin: toMinutes(item.startTime),
            user: user.name,
            role: "directeur",
          });
        },
      },
    });
  };

  /* ---------- Modification de grille validée → modale critique ---------- */
  const confirmCriticalDrop = () => {
    if (!pendingDrop) return;
    const program = programs.find((p) => p.id === pendingDrop.programId);
    const item = applyAdd(pendingDrop.programId, pendingDrop.startMin, true);
    if (item) {
      raiseCriticalAlert(
        `Ajout de « ${program?.title} »`,
        `Remplacement du créneau ${item.startTime}–${item.endTime} par « ${program?.title} » sur la grille validée du ${selectedDate}.`,
        item
      );
    }
    setPendingDrop(null);
  };

  const confirmCriticalRemove = () => {
    if (!pendingRemove) return;
    const program = programs.find((p) => p.id === pendingRemove.programId);
    removeScheduleItem({ itemId: pendingRemove.id, date: selectedDate, user: user.name, role: "directeur" });
    raiseCriticalAlert(
      `Retrait de « ${program?.title} »`,
      `« ${program?.title} » (${pendingRemove.startTime}–${pendingRemove.endTime}) retiré de la grille validée du ${selectedDate}. Créneau désormais vide.`,
      pendingRemove
    );
    setPendingRemove(null);
  };

  const raiseCriticalAlert = (title: string, message: string, item: ScheduleItem) => {
    addAlert({
      severity: "critical",
      title: `Modification d’une grille validée — ${title}`,
      message: `${message}\nAction requise dans vMix. Modification en attente d’acquittement par la Régie.`,
      source: "director",
      actionRequired: true,
      relatedScheduleId: item.id,
    });
    sendChange(`${title} (${item.startTime}–${item.endTime}, ${selectedDate})`);
    addLog({
      acteur: "directeur",
      action: "Modification critique de grille validée",
      ts: Date.now(),
    });
    toast({
      title: "Modification en attente d’acquittement",
      message: "La Régie de diffusion a reçu une alerte critique (action vMix requise).",
      tone: "error",
    });
  };

  const submit = () => {
    if (verdict.gaps.length > 0 || verdict.overlaps.length > 0) {
      toast({ title: "Soumission impossible", message: verdict.reasons[0], tone: "error" });
      return;
    }
    setGridStatus({ date: selectedDate, status: "pending", user: user.name, role: "directeur" });
    toast({ title: "Grille soumise pour validation", message: `La grille du ${selectedDate} attend l’approbation du Directeur d’Antenne.`, tone: "info" });
  };

  const publish = () => {
    setGridStatus({ date: selectedDate, status: "validated", user: user.name, role: "directeur", note: `Publication de la grille du ${selectedDate} (validée).` });
    toast({ title: "Grille publiée", message: `La grille du ${selectedDate} est visible sur le portail public.`, tone: "success" });
  };

  const gapLabel =
    verdict.gaps.length > 0
      ? `Grille incomplète — ${verdict.gaps.length} trou${verdict.gaps.length > 1 ? "s" : ""} détecté${verdict.gaps.length > 1 ? "s" : ""}`
      : "Grille complète";

  const statusMeta = STATUS_META[gridStatus];

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 border-b border-ink-700 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.22em] text-balafon">Balafon Studio · Direction</p>
          <h1 className="font-display mt-1 text-2xl font-extrabold uppercase text-paper">Créer et programmer une grille</h1>
          <p className="mt-1 text-[12.5px] text-mist">Glissez une émission de la bibliothèque vers la timeline, puis publiez la grille.</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-mist-dark">
          <span className="h-2 w-2 rounded-full bg-studio" aria-hidden />
          Constructeur EPG actif
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Contexte de la grille">
        <AdminContextCard icon={<CalendarDays size={15} />} label="Date en édition" value={selectedDate} accent="#E31E24" />
        <AdminContextCard icon={<Clock3 size={15} />} label="Fenêtre antenne" value="06:00 → 24:00" accent="#0F6BD6" />
        <AdminContextCard
          icon={<Database size={15} />}
          label="Source des données"
          value={dataSource === "api" ? "API Django" : "Mode démonstration"}
          accent={dataSource === "api" ? "#00F5A0" : "#FFB800"}
        />
        <AdminContextCard
          icon={<span className="h-2.5 w-2.5 rounded-full" style={{ background: statusMeta.color }} />}
          label="Cycle éditorial"
          value={statusMeta.label}
          accent={statusMeta.color}
        />
      </section>

      <div className="grid min-h-0 gap-6 xl:grid-cols-[300px_1fr]">
      {/* ================= BIBLIOTHÈQUE DRAGGABLE ================= */}
      <aside className="order-2 overflow-y-auto xl:order-1">
        <div className="rounded-2xl border border-ink-700 bg-ink-800/70 p-4 xl:sticky xl:top-0">
          <h2 className="font-display text-[15px] font-extrabold text-paper">Bibliothèque des programmes</h2>
          <p className="mt-1 text-[11.5px] text-mist-dark">Glissez une carte vers un créneau de la timeline, ou cliquez sur un trou.</p>

          <div className="mt-3 flex items-center gap-2 rounded-lg border border-ink-600 bg-ink-900 px-2.5 py-1.5 focus-within:border-balafon/60">
            <Search size={13} className="text-mist" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un programme…"
              aria-label="Rechercher un programme"
              className="w-full bg-transparent text-[12.5px] text-paper placeholder:text-mist-dark focus:outline-none"
            />
          </div>
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            aria-label="Filtrer par catégorie"
            className="mt-2 w-full rounded-lg border border-ink-600 bg-ink-900 px-2.5 py-1.5 text-[12px] font-semibold text-mist focus:outline-none"
          >
            <option value="all">Toutes les catégories</option>
            {Object.entries(CATEGORY_META)
              .filter(([k]) => k !== "off-air")
              .map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
          </select>

          <ul className="mt-3 max-h-[46vh] space-y-2 overflow-y-auto pr-1 xl:max-h-[52vh]">
            {library.map((p) => (
              <LibraryCard key={p.id} program={p} />
            ))}
            {library.length === 0 && <li className="py-6 text-center text-[12px] text-mist-dark">Aucun résultat.</li>}
          </ul>
        </div>
      </aside>

      {/* ================= TIMELINE + CONTRÔLES ================= */}
      <section className="order-1 flex min-h-0 min-w-0 flex-col xl:order-2">
        <div className="shrink-0">
          <div className="mt-4">
            <DaySelector value={selectedDate} onChange={setSelectedDate} startOffset={0} days={7} />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Badge color={statusMeta.color} soft={statusMeta.soft} className="px-2.5 py-1 text-[11px]">
              {statusMeta.label}
            </Badge>
            <span
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-extrabold ${
                verdict.gaps.length > 0 ? "border-crit/50 bg-crit/10 text-crit" : "border-studio/50 bg-studio/10 text-studio"
              }`}
              role="status"
            >
              {verdict.gaps.length > 0 ? <AlertTriangle size={13} aria-hidden /> : null}
              {gapLabel} · couverture {verdict.coverage} %
            </span>
            {grid && (
            <span className="text-[11px] text-mist-dark">
              Auteur : {grid.author} · modifiée {grid.updatedAt.slice(0, 16).replace("T", " à ")}
            </span>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={submit} disabled={gridStatus !== "draft"} title={gridStatus !== "draft" ? "La grille n’est plus en brouillon" : undefined}>
              <Send size={13} aria-hidden /> Soumettre à la validation
            </Button>
            <Button
              variant="green"
              onClick={publish}
              disabled={!verdict.ok}
              title={!verdict.ok ? verdict.reasons.join(" · ") : "Publier sur le portail public"}
            >
              <Upload size={13} aria-hidden /> Publier la grille
            </Button>
          </div>
        </div>
        </div>
        <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {!verdict.ok && (
            <ul className="space-y-1 rounded-xl border border-crit/30 bg-crit/5 p-3">
              {verdict.reasons.map((r) => (
                <li key={r} className="flex items-start gap-2 text-[12px] font-semibold text-crit/90">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" aria-hidden /> {r}
                </li>
              ))}
            </ul>
          )}

          <BalafonEpg
            date={selectedDate}
            mode="admin"
            now={now}
            dayStartMin={ADMIN_DAY_START}
            gridStatus={gridStatus}
            heightPx={560}
            onDropProgram={(programId, startMin) => handleProgramDrop({ programId, targetTime: startMin })}
            onRemoveItem={handleRemove}
            onMissingClick={(d) =>
              setPicker({
                open: true,
                startMin: toMinutes(d.since.slice(11, 16)),
                endMin: d.till.slice(11, 16) === "00:00" ? 1440 : toMinutes(d.till.slice(11, 16)),
              })
            }
            onSelectItem={(d) => navigate(`/tv/program/${d.programId}`)}
          />

          {verdict.gaps.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {verdict.gaps.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setPicker({ open: true, startMin: toMinutes(g.startTime), endMin: toMinutes(g.endTime) })}
                  className="hatch-red flex items-center justify-between rounded-xl border border-crit/60 px-4 py-3 text-left transition-colors hover:border-crit"
                >
                  <span>
                    <span className="block text-[12.5px] font-extrabold text-crit">Programme manquant</span>
                    <span className="font-mono text-[11.5px] text-crit/80">
                      {g.startTime} – {g.endTime} · {durationLabel(g.durationMinutes)}
                    </span>
                  </span>
                  <span className="rounded-md bg-crit/15 px-2 py-1 text-[11px] font-bold text-crit">Compléter</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
      </div>

      <section className="mt-6" aria-label="Calendrier des grilles">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <CalendarDays size={16} className="text-balafon" aria-hidden />
          <h2 className="font-display text-lg font-extrabold uppercase text-paper">Calendrier des grilles</h2>
          <span className="font-mono text-[11px] text-mist-dark">Sélectionnez une date à programmer</span>
        </div>
        <GrilleCalendar value={selectedDate} onChange={setSelectedDate} />
      </section>

      {/* ================= MODALE CRITIQUE ================= */}
      <Modal open={pendingDrop !== null || pendingRemove !== null} onClose={() => { setPendingDrop(null); setPendingRemove(null); }} title="Attention : modification d’une grille validée" tone="critical">
        <div className="flex items-start gap-3 rounded-xl border border-crit/40 bg-crit/10 p-4">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-crit" aria-hidden />
          <p className="text-[13.5px] leading-relaxed text-paper">
            Cette modification déclenchera une <strong className="text-crit">alerte temps réel à la Régie de diffusion</strong>{" "}
            et peut nécessiter une action dans vMix.
          </p>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-[12.5px]">
          <Field label="Utilisateur" value={user.name} />
          <Field label="Date de la grille" value={selectedDate} />
          {pendingDrop && (
            <>
              <Field label="Nouveau programme" value={programs.find((p) => p.id === pendingDrop.programId)?.title ?? "—"} />
              <Field label="Nouvelle heure" value={`${toHHMM(pendingDrop.startMin)} – ${toHHMM(pendingDrop.startMin + (programs.find((p) => p.id === pendingDrop.programId)?.durationMinutes ?? 0))}`} />
            </>
          )}
          {pendingRemove && (
            <>
              <Field label="Ancien programme" value={programs.find((p) => p.id === pendingRemove.programId)?.title ?? "—"} />
              <Field label="Ancienne heure" value={`${pendingRemove.startTime} – ${pendingRemove.endTime}`} />
            </>
          )}
          <Field label="Niveau de criticité" value="CRITIQUE" accent="#EF4444" />
          <Field label="Cible" value="Régie + vMix (simulation)" />
        </dl>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => { setPendingDrop(null); setPendingRemove(null); }}>Abandonner</Button>
          <Button variant="danger" onClick={pendingDrop ? confirmCriticalDrop : confirmCriticalRemove}>
            Confirmer la modification
          </Button>
        </div>
      </Modal>

      {/* ================= SÉLECTEUR POUR UN TROU ================= */}
      <Modal open={picker.open} onClose={() => setPicker({ ...picker, open: false })} title={`Compléter le créneau ${toHHMM(picker.startMin)} – ${toHHMM(picker.endMin)}`} width="max-w-2xl">
        <ul className="grid gap-2 sm:grid-cols-2">
          {programs
            .filter((p) => p.category !== "off-air" && p.durationMinutes <= picker.endMin - picker.startMin)
            .map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    setPicker({ ...picker, open: false });
                    handleProgramDrop({ programId: p.id, targetTime: picker.startMin });
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-ink-600 bg-ink-900 p-2.5 text-left transition-colors hover:border-balafon/60"
                >
                  <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                    <ProgramPoster program={p} className="h-full w-full" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-extrabold text-paper">{p.title}</span>
                    <span className="text-[11px] text-mist-dark">
                      {durationLabel(p.durationMinutes)} · {CATEGORY_META[p.category].label}
                    </span>
                  </span>
                </button>
              </li>
            ))}
        </ul>
        <p className="mt-3 text-[11.5px] text-mist-dark">
          Seuls les programmes tenant dans le créneau ({durationLabel(picker.endMin - picker.startMin)}) sont proposés.
        </p>
      </Modal>
    </div>
  );
}

function Field({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-ink-600 bg-ink-900 px-3 py-2">
      <dt className="text-[10px] font-extrabold uppercase tracking-widest text-mist-dark">{label}</dt>
      <dd className="mt-0.5 truncate font-semibold" style={{ color: accent ?? "var(--color-paper)" }}>{value}</dd>
    </div>
  );
}

function AdminContextCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-ink-700 bg-ink-800/60 px-3.5 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ color: accent, background: `${accent}18` }}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[9.5px] font-extrabold uppercase tracking-[0.15em] text-mist-dark">{label}</span>
        <span className="mt-0.5 block truncate font-mono text-[12px] font-bold text-paper">{value}</span>
      </span>
    </div>
  );
}

function LibraryCard({ program }: { program: Program }) {
  const meta = CATEGORY_META[program.category];
  return (
    <motion.li
      draggable
      onDragStart={(e) => {
        const dragEvent = e as unknown as React.DragEvent<HTMLLIElement>;
        dragEvent.dataTransfer.setData(
          "text/plain",
          JSON.stringify({ emissionId: program.id, dureeMinutes: program.durationMinutes })
        );
        dragEvent.dataTransfer.setData("text/balafon-program", program.id);
        dragEvent.dataTransfer.effectAllowed = "move";
      }}
      whileHover={{ y: -2 }}
      className="flex cursor-grab items-center gap-2.5 rounded-xl border border-ink-600 bg-ink-900 p-2.5 transition-colors hover:border-balafon/50 active:cursor-grabbing"
      aria-label={`${program.title} — glisser vers un créneau`}
    >
      <GripVertical size={15} className="shrink-0 text-mist-dark" aria-hidden />
      <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg">
        <ProgramPoster program={program} className="h-full w-full" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-extrabold text-paper">{program.title}</span>
        <span className="mt-0.5 flex items-center gap-1.5">
          <span className="rounded-sm px-1.5 py-px text-[9px] font-extrabold uppercase" style={{ background: meta.soft, color: meta.color }}>
            {meta.label}
          </span>
          <span className="font-mono text-[10.5px] text-mist-dark">{durationLabel(program.durationMinutes)}</span>
        </span>
      </span>
      <span className="shrink-0 rounded-md border border-dashed border-ink-500 px-1.5 py-1 text-[9px] font-bold uppercase text-mist-dark">
        Glisser
      </span>
    </motion.li>
  );
}