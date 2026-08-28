import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2, Tv } from "lucide-react";
import { motion } from "framer-motion";
import { useScheduleStore } from "../../store/scheduleStore";
import { useAppStore } from "../../store/appStore";
import { Badge, Button, EmptyState, Modal } from "../../components/ui";
import { ProgramPoster } from "../../components/media/ProgramPoster";
import { CATEGORY_META, type Program, type ProgramCategory } from "../../types";
import { durationLabel } from "../../utils/time";

const EMPTY_FORM = {
  title: "",
  subtitle: "",
  description: "",
  category: "entertainment" as ProgramCategory,
  durationMinutes: 30,
  posterUrl: "",
  isReplayAvailable: false,
  tags: "",
};

export function ProgramLibrary() {
  const programs = useScheduleStore((s) => s.programs);
  const scheduleMap = useScheduleStore((s) => s.scheduleMap);
  const upsertProgram = useScheduleStore((s) => s.upsertProgram);
  const deleteProgram = useScheduleStore((s) => s.deleteProgram);
  const toast = useAppStore((s) => s.toast);

  const [query, setQuery] = useState("");
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return programs.filter(
      (p) => p.category !== "off-air" && (q === "" || p.title.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }, [programs, query]);

  const usageCount = (programId: string) =>
    Object.values(scheduleMap).reduce((acc, items) => acc + items.filter((i) => i.programId === programId).length, 0);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (p: Program) => {
    setForm({
      title: p.title,
      subtitle: p.subtitle ?? "",
      description: p.description,
      category: p.category,
      durationMinutes: p.durationMinutes,
      posterUrl: p.posterUrl,
      isReplayAvailable: p.isReplayAvailable ?? false,
      tags: p.tags.join(", "),
    });
    setEditingId(p.id);
    setErrors({});
    setModalOpen(true);
  };

  const save = () => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = "Le titre est obligatoire.";
    if (!form.description.trim()) errs.description = "La description est obligatoire (contrôle de complétude).";
    if (!Number.isFinite(form.durationMinutes) || form.durationMinutes < 5 || form.durationMinutes > 480)
      errs.duration = "Durée entre 5 et 480 minutes.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const existing = editingId ? programs.find((p) => p.id === editingId) : null;
    upsertProgram({
      id: editingId ?? `p-${Date.now()}`,
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || undefined,
      description: form.description.trim(),
      category: form.category,
      durationMinutes: Math.round(form.durationMinutes),
      posterUrl: form.posterUrl.trim(),
      status: existing?.status ?? "draft",
      isReplayAvailable: form.isReplayAvailable,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
    toast({ title: editingId ? "Programme mis à jour" : "Programme créé", message: `« ${form.title.trim()} » enregistré dans la bibliothèque.`, tone: "success" });
    setModalOpen(false);
  };

  const remove = (p: Program) => {
    if (usageCount(p.id) > 0) {
      toast({ title: "Suppression impossible", message: `« ${p.title} » est planifié ${usageCount(p.id)} fois dans les grilles. Retirez-le d’abord.`, tone: "error" });
      return;
    }
    deleteProgram(p.id);
    toast({ title: "Programme supprimé", message: `« ${p.title} » retiré de la bibliothèque.`, tone: "warning" });
    setConfirmDelete(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 focus-within:border-balafon/60">
          <Search size={14} className="text-mist" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher (titre, tag)…"
            aria-label="Rechercher dans la bibliothèque"
            className="w-52 bg-transparent text-[13px] text-paper placeholder:text-mist-dark focus:outline-none"
          />
        </div>
        <p className="text-[12.5px] text-mist-dark">{shown.length} programme(s) · les éléments incomplets bloquent la publication des grilles.</p>
        <Button className="ml-auto" onClick={openCreate}>
          <Plus size={14} aria-hidden /> Ajouter un programme
        </Button>
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={<Tv size={32} />} title="Aucun programme trouvé" hint="Modifiez votre recherche ou créez un nouveau programme." action={<Button onClick={openCreate}>Créer un programme</Button>} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ink-700 bg-ink-800/70">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-ink-700 text-[10.5px] uppercase tracking-widest text-mist-dark">
                <th className="px-4 py-3">Programme</th>
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3">Durée</th>
                <th className="px-4 py-3">Replay</th>
                <th className="px-4 py-3">Utilisations</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700">
              {shown.map((p, i) => (
                <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="transition-colors hover:bg-ink-700/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg"><ProgramPoster program={p} className="h-full w-full" /></span>
                      <div className="min-w-0">
                        <p className="truncate font-extrabold text-paper">{p.title}</p>
                        <p className="truncate text-[11px] text-mist-dark">{p.subtitle ?? p.tags.slice(0, 3).join(" · ")}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={CATEGORY_META[p.category].color} soft={CATEGORY_META[p.category].soft}>{CATEGORY_META[p.category].label}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-mist">{durationLabel(p.durationMinutes)}</td>
                  <td className="px-4 py-3">
                    {p.isReplayAvailable ? <Badge color="#00F5A0" soft="rgba(0,245,160,0.12)">Disponible</Badge> : <span className="text-[11.5px] text-mist-dark">—</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-mist">{usageCount(p.id)} créneau(x)</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(p)} aria-label={`Modifier ${p.title}`}>
                        <Pencil size={13} aria-hidden /> Modifier
                      </Button>
                      {confirmDelete === p.id ? (
                        <Button size="sm" variant="danger" onClick={() => remove(p)}>Confirmer ?</Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(p.id)} aria-label={`Supprimer ${p.title}`}>
                          <Trash2 size={13} aria-hidden />
                        </Button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Modifier le programme" : "Nouveau programme"} width="max-w-xl">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Titre *" error={errors.title}>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder="Ex. : Balafon Infos Matin" />
          </Field>
          <Field label="Sous-titre">
            <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className={inputCls} placeholder="Accroche courte" />
          </Field>
          <Field label="Catégorie">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ProgramCategory })} className={inputCls}>
              {Object.entries(CATEGORY_META).filter(([k]) => k !== "off-air").map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Durée (minutes) *" error={errors.duration}>
            <input type="number" min={5} max={480} step={5} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="URL de l’affiche (optionnel)">
            <input value={form.posterUrl} onChange={(e) => setForm({ ...form, posterUrl: e.target.value })} className={inputCls} placeholder="https://…/affiche.jpg" />
          </Field>
          <Field label="Tags (séparés par des virgules)">
            <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className={inputCls} placeholder="info, matin" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description *" error={errors.description}>
              <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} placeholder="Présentation éditoriale de l’émission…" />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-[13px] font-semibold text-mist">
            <input type="checkbox" checked={form.isReplayAvailable} onChange={(e) => setForm({ ...form, isReplayAvailable: e.target.checked })} className="h-4 w-4 accent-[#00F5A0]" />
            Disponible en replay après diffusion
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Annuler</Button>
          <Button onClick={save}>{editingId ? "Enregistrer" : "Créer le programme"}</Button>
        </div>
      </Modal>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-[13px] text-paper placeholder:text-mist-dark focus:border-balafon/60 focus:outline-none";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-widest text-mist-dark">{label}</label>
      {children}
      {error && <p className="mt-1 text-[11.5px] font-bold text-crit" role="alert">{error}</p>}
    </div>
  );
}
