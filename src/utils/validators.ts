/* ============================================================
   Schémas Zod — validation de formulaires côté front.

   Réplique les règles métier du backend (DRF) pour un feedback
   immédiat avant l'envoi : email/mot de passe, émission
   (heure_fin > heure_debut), anti-chevauchement.
   ============================================================ */
import { z } from "zod";

/* ------------------------------------------------------- Connexion */
export const schemaConnexion = z.object({
  email: z
    .string()
    .min(1, "L'email est requis.")
    .email("Adresse email invalide."),
  motDePasse: z
    .string()
    .min(1, "Le mot de passe est requis.")
    .min(8, "8 caractères minimum."),
});
export type FormulaireConnexion = z.infer<typeof schemaConnexion>;

/* ------------------------------------------------------- Compte utilisateur */
export const schemaUtilisateur = z.object({
  nom: z.string().trim().min(2, "Le nom complet est requis (2 caractères min)."),
  email: z
    .string()
    .trim()
    .email("Adresse email invalide.")
    .refine((v) => v.endsWith("@balafon.media"), {
      message: "Seuls les emails @balafon.media sont acceptés.",
    }),
  role: z.enum(["directeur", "regie"]),
  fonction: z.string().trim(),
});
export type FormulaireUtilisateur = z.infer<typeof schemaUtilisateur>;

/* ------------------------------------------------------- Émission */
export const schemaEmission = z
  .object({
    titre: z.string().min(2, "Titre trop court (2 caractères min).").max(200),
    genre: z.string().min(1, "Choisissez un genre."),
    description: z.string().max(1000).optional().default(""),
    heure_debut: z.string().min(5, "Heure de début requise (HH:MM)."),
    heure_fin: z.string().min(5, "Heure de fin requise (HH:MM)."),
  })
  .refine(
    (d) => d.heure_fin > d.heure_debut,
    { message: "L'heure de fin doit être strictement après l'heure de début.", path: ["heure_fin"] }
  );
export type FormulaireEmission = z.infer<typeof schemaEmission>;

/** Vérifie qu'un créneau [debut, fin) ne chevauche aucun créneau existant. */
export function verifChevauchement(
  debut: string,
  fin: string,
  creneaux: Array<{ heure_debut: string; heure_fin: string }>
): boolean {
  return !creneaux.some((c) => debut < c.heure_fin && fin > c.heure_debut);
}
