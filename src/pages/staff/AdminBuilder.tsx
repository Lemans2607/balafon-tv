import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  Database,
  GripVertical,
  Search,
  Send,
  ShieldAlert,
  Upload,
  Sparkles,
  Info,
  ChevronRight,
  Plus
} from "lucide-react";
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
   Interface unifiée et épurée inspirée des régies de diffusion.
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

  const [activeSidebarTab, setActiveSidebarTab] = useState<"library" | "calendar">("library");
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [pendingDrop, setPendingDrop] = useState<{ programId: string; startMin: number } | null>(null);
  const [pendingRemove, setPendingRemove] = useState<ScheduleItem | null>(null);
  const [picker, setPicker] = useState<{ open: boolean; startMin: number; endMin: number }>({ open: false, startMin: 0, endMin: 0 });

  if (role !== "directeur_antenne") {
    return (
      <div className="rounded-2xl border border-goldwarn/40 bg-goldwarn/8 p-8 text-center max-w-xl mx-auto my-12">
        <ShieldAlert size={32} className="mx-auto text-goldwarn" aria-hidden />
        <h1 className="font-display mt-4 text-2xl font-extrabold text-paper">Accès réservé — Direction d’Antenne</h1>
        <p className="mx-auto mt-2 text-[14px] leading-relaxed text-mist">
          Le constructeur de grille est opéré par le Directeur d’Antenne (administrateur de la plateforme).
          Veuillez vous connecter avec un compte Direction pour y accéder.
        </p>
        <div className="mt-6">
          <Button onClick={() => navigate("/login")}>Se connecter</Button>
        </div>
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
          message: "La grille reste visible localement. Vérifiez la connexion.",
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
    toast({ title: "Grille soumise pour validation", message: `La grille du ${selectedDate} attend l’approbation de l'antenne.`, tone: "info" });
  };

  const publish = () => {
    setGridStatus({ date: selectedDate, status: "validated", user: user.name, role: "directeur", note: `Publication de la grille du ${selectedDate}.` });
    toast({ title: "Grille publiée", message: `La grille du ${selectedDate} est active sur le portail public.`, tone: "success" });
  };

  const gapLabel =
    verdict.gaps.length > 0
      ? `${verdict.gaps.length} trou${verdict.gaps.length > 1 ? "s" : ""} détecté${verdict.gaps.length > 1 ? "s" : ""}`
      : "Grille complète";

  const statusMeta = STATUS_META[gridStatus];

  return (
    <div className="space-y-6">
      {/* ================= HEADER SIMPLIFIÉ & ÉLÉGANT ================= */}
      <header className="flex flex-col gap-4 border-b border-ink-800 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-balafon/10 text-balafon font-mono text-[10px] font-bold">B</span>
            <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.25em] text-balafon">Balafon TV · Workstation</p>
          </div>
          <h1 className="font-display mt-1.5 text-3xl font-black uppercase tracking-tight text-paper">
            Programmation de l'Antenne
          </h1>
          <p className="mt-1 text-[13px] text-mist">
            Glissez vos émissions vers la timeline EPG, analysez la couverture d'antenne, puis publiez la grille.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-900/80 px-3 py-2">
            <Database size={13} className="text-studio" />
            <span className="font-mono text-[11px] font-bold text-paper">
              {dataSource === "api" ? "Connecté Django" : "Données Démo"}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-900/80 px-3 py-2">
            <Clock3 size={13} className="text-ocean-soft" />
            <span className="font-mono text-[11px] font-bold text-paper">06:00 → 24:00 (WAT)</span>
          </div>
        </div>
      </header>

      {/* ================= WORKSPACE EN DEUX COLONNES ================= */}
      <div className="grid gap-6 xl:grid-cols-[320px_1fr] items-start">
        
        {/* ================= COLONNE GAUCHE COMPACTE (SIDEBAR MUTABLE) ================= */}
        <aside className="sticky top-24 space-y-4">
          
          {/* Segmented Tab Bar - Unification du Calendrier et de la Bibliothèque */}
          <div className="flex rounded-xl bg-ink-900 p-1 border border-ink-800">
            <button
              type="button"
              onClick={() => setActiveSidebarTab("library")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-[12px] font-extrabold rounded-lg transition-all ${
                activeSidebarTab === "library"
                  ? "bg-balafon text-white shadow-md"
                  : "text-mist hover:text-paper hover:bg-ink-800/40"
              }`}
            >
              <span>📂 Émissions</span>
              <span className="text-[10px] opacity-75">({library.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSidebarTab("calendar")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-[12px] font-extrabold rounded-lg transition-all ${
                activeSidebarTab === "calendar"
                  ? "bg-balafon text-white shadow-md"
                  : "text-mist hover:text-paper hover:bg-ink-800/40"
              }`}
            >
              <span>📅 Calendrier</span>
            </button>
          </div>

          {/* Bibliothèque draggable */}
          {activeSidebarTab === "library" && (
            <div className="rounded-2xl border border-ink-800 bg-ink-900/60 p-4 space-y-4">
              <div>
                <h2 className="font-display text-[14px] font-black uppercase text-paper tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-balafon" /> Émissions Disponibles
                </h2>
                <p className="mt-1 text-[11px] text-mist-dark leading-relaxed">
                  Glissez une émission vers la timeline ou cliquez sur un créneau vide de la grille.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-950 px-2.5 py-2 focus-within:border-balafon/50 transition-colors">
                  <Search size={13} className="text-mist-dark" aria-hidden />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filtrer par titre, tag..."
                    aria-label="Rechercher un programme"
                    className="w-full bg-transparent text-[12.5px] text-paper placeholder:text-mist-dark focus:outline-none"
                  />
                </div>
                <select
                  value={catFilter}
                  onChange={(e) => setCatFilter(e.target.value)}
                  aria-label="Filtrer par catégorie"
                  className="w-full rounded-lg border border-ink-700 bg-ink-950 px-2.5 py-2 text-[12px] font-semibold text-mist focus:outline-none"
                >
                  <option value="all">Toutes les catégories</option>
                  {Object.entries(CATEGORY_META)
                    .filter(([k]) => k !== "off-air")
                    .map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                </select>
              </div>

              <ul className="space-y-2 max-h-[50vh] overflow-y-auto pr-1 scrollbar-fine">
                {library.map((p) => (
                  <LibraryCard key={p.id} program={p} />
                ))}
                {library.length === 0 && (
                  <li className="py-8 text-center text-[12px] text-mist-dark border border-dashed border-ink-800 rounded-xl">
                    Aucune émission trouvée.
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Calendrier Mensuel Integré */}
          {activeSidebarTab === "calendar" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl overflow-hidden border border-ink-800"
            >
              <GrilleCalendar value={selectedDate} onChange={setSelectedDate} />
            </motion.div>
          )}

        </aside>

        {/* ================= COLONNE DROITE (TIMELINE & CONTRÔLEUR DE GRILLE) ================= */}
        <section className="space-y-5 min-w-0">
          
          {/* CONTROL BAR DE LA GRILLE DU JOUR */}
          <div className="panel p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-ink-800 bg-ink-900/40">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[14px] font-black text-paper">{selectedDate}</span>
                <Badge color={statusMeta.color} soft={statusMeta.soft} className="px-2 py-0.5 text-[10.5px]">
                  {statusMeta.label}
                </Badge>
                <span
                  className={`flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                    verdict.gaps.length > 0 ? "bg-crit/10 text-crit border border-crit/15" : "bg-studio/10 text-studio border border-studio/15"
                  }`}
                >
                  {verdict.gaps.length > 0 ? <AlertTriangle size={11} /> : null}
                  {gapLabel} ({verdict.coverage} % couverture)
                </span>
              </div>
              {grid && (
                <p className="text-[11.5px] text-mist-dark">
                  Mise à jour par <strong className="text-mist">{grid.author}</strong> le {grid.updatedAt.slice(0, 16).replace("T", " à ")}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 shrink-0">
              <Button
                variant="outline"
                onClick={submit}
                disabled={gridStatus !== "draft"}
                title={gridStatus !== "draft" ? "La grille n'est plus modifiable" : undefined}
                className="h-10 text-[12px] font-bold"
              >
                <Send size={13} /> Soumettre la grille
              </Button>
              <Button
                variant="green"
                onClick={publish}
                disabled={!verdict.ok}
                title={!verdict.ok ? verdict.reasons.join(" · ") : "Publier"}
                className="h-10 text-[12px] font-bold shadow-lg"
              >
                <Upload size={13} /> Publier la Grille
              </Button>
            </div>
          </div>

          {/* Quick Date-Switcher (7 jours) */}
          <div className="bg-ink-900/20 p-2 rounded-2xl border border-ink-800/80">
            <DaySelector value={selectedDate} onChange={setSelectedDate} startOffset={0} days={7} />
          </div>

          {/* Alertes de validation compactes */}
          <AnimatePresence>
            {!verdict.ok && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-crit/20 bg-crit/5 p-3.5 space-y-1.5">
                  <p className="text-[12px] font-extrabold text-crit uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle size={13} /> Erreurs de validation à résoudre
                  </p>
                  <ul className="space-y-1">
                    {verdict.reasons.map((r) => (
                      <li key={r} className="text-[11.5px] text-mist leading-relaxed flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full bg-crit shrink-0" /> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* LA TIMELINE EPG (PLANBY) */}
          <div className="panel overflow-hidden border-ink-800 shadow-[0_12px_40px_rgba(2,4,9,0.4)]">
            <BalafonEpg
              date={selectedDate}
              mode="admin"
              now={now}
              dayStartMin={ADMIN_DAY_START}
              gridStatus={gridStatus}
              heightPx={500}
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
          </div>

          {/* SUGGESTION DE COMPLÉTION DES TROUS */}
          {verdict.gaps.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="font-display text-[12px] font-black uppercase text-paper tracking-wider flex items-center gap-1.5">
                <Info size={13} className="text-balafon-soft" /> Suggestion de comblement de créneaux
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {verdict.gaps.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setPicker({ open: true, startMin: toMinutes(g.startTime), endMin: toMinutes(g.endTime) })}
                    className="flex items-center justify-between rounded-xl border border-ink-700 bg-ink-900/60 px-4 py-3 text-left transition-colors hover:border-balafon/40 group hover:bg-ink-900"
                  >
                    <span className="min-w-0">
                      <span className="block text-[12px] font-bold text-mist-dark group-hover:text-mist transition-colors">Trou détecté</span>
                      <span className="font-mono text-[13px] font-extrabold text-paper tabular-nums">
                        {g.startTime} – {g.endTime}
                      </span>
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-extrabold text-balafon bg-balafon/10 hover:bg-balafon/20 px-3 py-1.5 rounded-lg transition-colors">
                      <Plus size={11} /> Remplir · {durationLabel(g.durationMinutes)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </section>
      </div>

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
        <ul className="grid gap-2 sm:grid-cols-2 max-h-[60vh] overflow-y-auto pr-1">
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
                  className="flex w-full items-center gap-3 rounded-xl border border-ink-700 bg-ink-950 p-2.5 text-left transition-colors hover:border-balafon/60 hover:bg-ink-900"
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
    <div className="rounded-lg border border-ink-700 bg-ink-950 px-3 py-2">
      <dt className="text-[10px] font-extrabold uppercase tracking-widest text-mist-dark">{label}</dt>
      <dd className="mt-0.5 truncate font-semibold" style={{ color: accent ?? "var(--color-paper)" }}>{value}</dd>
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
      className="flex cursor-grab items-center gap-2.5 rounded-xl border border-ink-700 bg-ink-950 p-2.5 transition-colors hover:border-balafon/40 active:cursor-grabbing hover:bg-ink-900"
      aria-label={`${program.title} — glisser vers un créneau`}
    >
      <GripVertical size={14} className="shrink-0 text-mist-dark" aria-hidden />
      <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg">
        <ProgramPoster program={program} className="h-full w-full" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-extrabold text-paper leading-tight">{program.title}</span>
        <span className="mt-0.5 flex items-center gap-1.5">
          <span className="rounded-sm px-1.5 py-px text-[8.5px] font-extrabold uppercase" style={{ background: meta.soft, color: meta.color }}>
            {meta.label}
          </span>
          <span className="font-mono text-[10px] text-mist-dark">{durationLabel(program.durationMinutes)}</span>
        </span>
      </span>
      <span className="shrink-0 rounded bg-ink-900 border border-ink-800 px-1.5 py-1 text-[8.5px] font-extrabold uppercase text-mist-dark">
        EPG
      </span>
    </motion.li>
  );
}
