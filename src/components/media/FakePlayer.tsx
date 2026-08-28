import { Radio } from "lucide-react";
import { Modal } from "../ui";

/* ============================================================
   Lecteur simulé — aucun flux réel n'est diffusé.
   ============================================================ */
export function FakePlayer({
  open,
  onClose,
  title,
  subtitle,
  live = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  live?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-2xl">
      <div className="overflow-hidden rounded-xl border border-ink-600 bg-ink-950">
        <div className="relative flex aspect-video flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(255,61,0,0.12),transparent_65%)]">
          <div className="flex h-16 items-end gap-1.5" aria-hidden>
            {[...Array(9)].map((_, i) => (
              <span
                key={i}
                className={`w-2 rounded-t bg-balafon/80 ${["eq-bar1", "eq-bar2", "eq-bar3"][i % 3]}`}
                style={{ height: `${20 + ((i * 13) % 60)}%`, animationDelay: `${i * 0.08}s` }}
              />
            ))}
          </div>
          <p className="mt-5 font-display text-[17px] font-extrabold text-paper">{title}</p>
          {subtitle && <p className="mt-1 text-[12.5px] text-mist">{subtitle}</p>}
          {live && (
            <span className="live-pulse mt-4 inline-flex items-center gap-1.5 rounded-md bg-balafon px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-widest text-white">
              <Radio size={11} aria-hidden /> Direct simulé
            </span>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-ink-700 px-4 py-3">
          <p className="text-[11.5px] font-semibold text-mist-dark">
            Mode démonstration — flux vidéo simulé. Aucun signal réel n'est émis.
          </p>
          <span className="font-mono text-[11px] text-mist">BALAFON TV · CANAL 04</span>
        </div>
      </div>
    </Modal>
  );
}
