"""
Signaux temps réel — programmation → alertes régie.

Ce fichier est nouveau. La règle qu'il applique vient du cahier des
charges : une alerte ne part vers la régie QUE si la grille concernée est
déjà validée (« diffusion en cours de préparation » ne doit jamais spammer
la régie). Une émission créée ou modifiée dans une grille en brouillon ne
déclenche donc rien ici — c'est le comportement normal du travail éditorial
courant.

`notifier_alerte()` (déjà présent dans alertes/services.py) est celui qui
pousse au groupe WebSocket de la chaîne ; ce module se contente de décider
QUAND créer une Alerte et de l'enregistrer, conformément au commentaire
d'alertes/services.py : la notification part de la couche métier, jamais
d'une vue.
"""
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from alertes.models import Alerte
from alertes.services import notifier_alerte

from .models import Emission, Grille


def _grille_validee(grille_id: int | None) -> Grille | None:
    """Renvoie la grille si elle existe et si elle est déjà validée."""
    if grille_id is None:
        return None
    grille = Grille.objects.filter(pk=grille_id).first()
    return grille if grille and grille.statut == Grille.Statut.VALIDEE else None


# --------------------------------------------------------------- Émissions

@receiver(post_save, sender=Emission)
def emission_enregistree(sender, instance: Emission, created: bool, **kwargs):
    grille = _grille_validee(instance.grille_id)
    if grille is None:
        return
    verbe = "ajoutée à" if created else "modifiée dans"
    alerte = Alerte.objects.create(
        grille=grille,
        emission=instance,
        type=Alerte.Type.MODIFICATION,
        message=f"« {instance.titre} » {verbe} la grille du {grille.date_debut:%d/%m/%Y}, déjà validée.",
    )
    notifier_alerte(alerte)


@receiver(post_delete, sender=Emission)
def emission_supprimee(sender, instance: Emission, **kwargs):
    # À ce stade, Django a déjà supprimé la ligne Emission mais pas encore
    # la Grille parente (le collector supprime les enfants avant le parent
    # dans une suppression en cascade) : la lecture ci-dessous est fiable.
    grille = _grille_validee(instance.grille_id)
    if grille is None:
        return
    alerte = Alerte.objects.create(
        grille=grille,
        type=Alerte.Type.MODIFICATION,
        message=f"« {instance.titre} » a été retirée de la grille du {grille.date_debut:%d/%m/%Y}, déjà validée.",
    )
    notifier_alerte(alerte)


# ----------------------------------------------------------------- Grilles

@receiver(pre_save, sender=Grille)
def grille_avant_sauvegarde(sender, instance: Grille, **kwargs):
    """Mémorise le statut précédent pour détecter une transition à la validation."""
    instance._statut_precedent = (
        Grille.objects.filter(pk=instance.pk).values_list("statut", flat=True).first()
        if instance.pk
        else None
    )


@receiver(post_save, sender=Grille)
def grille_enregistree(sender, instance: Grille, created: bool, **kwargs):
    precedent = getattr(instance, "_statut_precedent", None)
    vient_detre_validee = instance.statut == Grille.Statut.VALIDEE and precedent != Grille.Statut.VALIDEE
    if not vient_detre_validee:
        return
    alerte = Alerte.objects.create(
        grille=instance,
        type=Alerte.Type.VALIDATION,
        message=f"La grille du {instance.date_debut:%d/%m/%Y} a été validée pour diffusion.",
    )
    notifier_alerte(alerte)


@receiver(post_delete, sender=Grille)
def grille_supprimee(sender, instance: Grille, **kwargs):
    if instance.statut != Grille.Statut.VALIDEE:
        return
    # La grille n'existe déjà plus en base : on notifie sans FK grille
    # (le champ est nullable) pour ne pas perdre l'information.
    alerte = Alerte.objects.create(
        type=Alerte.Type.MODIFICATION,
        message=f"La grille du {instance.date_debut:%d/%m/%Y}, déjà validée, a été supprimée.",
    )
    # notifier_alerte() exige alerte.grille : sans grille, l'alerte reste
    # visible dans l'historique REST mais n'est pas diffusée en direct.
    if alerte.grille_id:
        notifier_alerte(alerte)
