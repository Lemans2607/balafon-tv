import type { Program, ScheduleItem } from "../types";
import { CATEGORY_META, STATUS_META, type GridStatus } from "../types";
import { durationLabel, toMinutes } from "./time";

/* ============================================================
   Export de la grille de programmes — archivage Admin/Direction.
   - CSV (séparateur « ; » + BOM pour Excel FR)
   - PDF via fenêtre d'impression dédiée (aucune dépendance)
   ============================================================ */

interface LigneExport {
  item: ScheduleItem;
  program: Program | null;
}

function lignes(items: ScheduleItem[], programs: Program[]): LigneExport[] {
  const byId = new Map(programs.map((p) => [p.id, p]));
  return [...items]
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))
    .map((item) => ({ item, program: byId.get(item.programId) ?? null }));
}

function csvEscape(v: string): string {
  return `"${v.replace(/"/g, '""')}"`;
}

/** Télécharge la grille du jour au format CSV (compatible Excel FR). */
export function exportGrilleCsv(
  date: string,
  items: ScheduleItem[],
  programs: Program[]
): void {
  const rows = lignes(items, programs);
  const header = [
    "Date",
    "Heure début",
    "Heure fin",
    "Durée",
    "Titre",
    "Catégorie",
    "Statut grille",
    "Source",
    "Sous-titre",
  ];
  const body = rows.map(({ item, program }) =>
    [
      item.date,
      item.startTime,
      item.endTime,
      durationLabel(toMinutes(item.endTime) - toMinutes(item.startTime)),
      program?.title ?? "(programme inconnu)",
      program ? CATEGORY_META[program.category].label : "—",
      STATUS_META[(item.status as GridStatus) ?? "draft"]?.label ?? item.status,
      item.source,
      program?.subtitle ?? "",
    ]
      .map(csvEscape)
      .join(";")
  );
  const csv = "\uFEFF" + [header.map(csvEscape).join(";"), ...body].join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `grille-balafon-tv-${date}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Ouvre une fenêtre d'impression dédiée → « Enregistrer en PDF ». */
export function exportGrillePdf(
  date: string,
  items: ScheduleItem[],
  programs: Program[],
  statut: GridStatus | null
): void {
  const rows = lignes(items, programs);
  const statutLabel = statut ? STATUS_META[statut].label : "—";
  const reel = rows.filter((r) => r.program?.category !== "off-air");

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Grille Balafon TV — ${date}</title>
<style>
  :root { color-scheme: light; }
  body { font-family: "Segoe UI", Arial, sans-serif; color: #131822; margin: 32px; }
  h1 { font-size: 22px; margin: 0; letter-spacing: 0.02em; text-transform: uppercase; }
  .brand { color: #E31E24; }
  .meta { color: #556072; font-size: 12px; margin: 6px 0 18px; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  th { text-align: left; text-transform: uppercase; font-size: 10px; letter-spacing: 0.08em;
       color: #556072; border-bottom: 2px solid #131822; padding: 6px 8px; }
  td { border-bottom: 1px solid #dde2ec; padding: 7px 8px; vertical-align: top; }
  td.heure { font-family: "Consolas", monospace; font-weight: 700; white-space: nowrap; color: #E31E24; }
  tr.offair td { color: #9aa3b2; font-style: italic; }
  .badge { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 10px;
           font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
  .footer { margin-top: 18px; font-size: 10.5px; color: #556072; }
  @media print { body { margin: 12mm; } }
</style>
</head>
<body>
  <h1>Balafon <span class="brand">TV</span> — Grille des programmes</h1>
  <p class="meta">
    Journée du <strong>${date}</strong> · Statut : <strong>${statutLabel}</strong> ·
    ${reel.length} émission(s) · Fenêtre d'antenne 06:00 – 24:00 · Fuseau Africa/Douala
  </p>
  <table>
    <thead>
      <tr><th>Horaire</th><th>Émission</th><th>Catégorie</th><th>Durée</th><th>Sous-titre</th></tr>
    </thead>
    <tbody>
      ${rows
        .map(({ item, program }) => {
          const off = program?.category === "off-air";
          const cat = program ? CATEGORY_META[program.category] : null;
          return `<tr class="${off ? "offair" : ""}">
            <td class="heure">${item.startTime} – ${item.endTime}</td>
            <td><strong>${program?.title ?? "(inconnu)"}</strong>${
            off ? " — aucune diffusion planifiée" : ""
          }</td>
            <td>${cat ? `<span class="badge" style="background:${cat.soft};color:${cat.color}">${cat.label}</span>` : "—"}</td>
            <td>${durationLabel(toMinutes(item.endTime) - toMinutes(item.startTime))}</td>
            <td>${program?.subtitle ?? ""}</td>
          </tr>`;
        })
        .join("")}
    </tbody>
  </table>
  <p class="footer">
    BALAFON + GUIDE · Balafon Media Group · Document généré le ${new Date().toLocaleString("fr-FR")} ·
    Portail dédié exclusivement à Balafon TV.
  </p>
  <script>window.onload = function () { window.print(); };<\/script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=1100");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
}
