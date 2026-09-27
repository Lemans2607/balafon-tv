"""
API d'audience — /api/audience/

    POST /api/audience/battement/      un écran signale qu'il regarde
    GET  /api/audience/direct/         compteur du programme en cours
    GET  /api/audience/classement/     les émissions les plus suivies
    GET  /api/audience/resume/         bandeau du tableau de bord
    GET  /api/audience/courbe/<id>/    série temporelle d'une émission

/direct/ est public (le portail affiche le compteur) ; le reste est
réservé aux comptes authentifiés.
"""
from datetime import timedelta

from django.db.models import Avg, Count, Max
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from programmation.models import Emission

from .models import FENETRE_ACTIVE, ReleveAudience, SessionAudience


def _ip(request) -> str:
    fwd = request.META.get("HTTP_X_FORWARDED_FOR", "")
    return fwd.split(",")[0].strip() if fwd else request.META.get("REMOTE_ADDR", "")


def emission_en_cours():
    """Émission d'une grille validée couvrant l'instant présent."""
    maintenant = timezone.now()
    return (
        Emission.objects.filter(
            grille__statut="validee",
            heure_debut__lte=maintenant,
            heure_fin__gt=maintenant,
        )
        .select_related("grille")
        .first()
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def battement(request):
    """
    Un écran signale sa présence, toutes les 30 s.
    Corps : { "session": "s-xxxx", "emission": 42 | null }

    Idempotent : le même couple (session, émission) met à jour la
    ligne existante plutôt que d'en créer une nouvelle.
    """
    cle = str(request.data.get("session", "")).strip()[:64]
    if not cle:
        return Response(
            {"detail": "Champ « session » requis."}, status=status.HTTP_400_BAD_REQUEST
        )

    emission_id = request.data.get("emission")
    if emission_id in ("", None):
        en_cours = emission_en_cours()
        emission_id = en_cours.id if en_cours else None

    empreinte = SessionAudience.empreinte_de(
        _ip(request), request.META.get("HTTP_USER_AGENT", "")
    )
    maintenant = timezone.now()

    session, cree = SessionAudience.objects.get_or_create(
        cle_session=cle,
        emission_id=emission_id,
        defaults={
            "empreinte": empreinte,
            "premier_battement": maintenant,
            "dernier_battement": maintenant,
        },
    )
    if not cree:
        session.dernier_battement = maintenant
        session.battements += 1
        session.save(update_fields=["dernier_battement", "battements"])

    return Response(
        {
            "enregistre": True,
            "emission": emission_id,
            "spectateurs": SessionAudience.actives(emission_id).count() if emission_id else 0,
        }
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def direct(request):
    """Compteur temps réel de l'émission en cours."""
    em = emission_en_cours()
    if not em:
        return Response(
            {
                "emission_id": None,
                "titre": "Hors antenne",
                "spectateurs": 0,
                "pic_du_jour": 0,
                "depuis": timezone.now().isoformat(),
            }
        )

    pic = (
        ReleveAudience.objects.filter(
            emission=em, instant__gte=timezone.now() - timedelta(hours=24)
        ).aggregate(p=Max("spectateurs"))["p"]
        or 0
    )
    actuels = SessionAudience.actives(em.id).count()

    return Response(
        {
            "emission_id": em.id,
            "titre": em.titre,
            "genre": em.genre,
            "spectateurs": actuels,
            "pic_du_jour": max(pic, actuels),
            "depuis": em.heure_debut.isoformat(),
            "jusqua": em.heure_fin.isoformat(),
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def classement(request):
    """
    Les émissions les plus suivies sur les N derniers jours.
    ?jours=7 (défaut, borné à 90) · ?genre=talk
    """
    try:
        jours = max(1, min(90, int(request.query_params.get("jours", 7))))
    except (TypeError, ValueError):
        jours = 7

    depuis = timezone.now() - timedelta(days=jours)

    qs = (
        ReleveAudience.objects.filter(instant__gte=depuis)
        .values("emission_id", "emission__titre", "emission__genre")
        .annotate(
            spectateurs_moyens=Avg("spectateurs"),
            pic=Max("spectateurs"),
            releves=Count("id"),
        )
        .order_by("-spectateurs_moyens")
    )

    genre = request.query_params.get("genre")
    if genre:
        qs = qs.filter(emission__genre=genre)

    resultat = []
    for ligne in qs[:50]:
        sessions = SessionAudience.objects.filter(
            emission_id=ligne["emission_id"], premier_battement__gte=depuis
        )
        total = sessions.count()
        duree_moyenne = (
            sum(s.duree_vue_s for s in sessions) / total if total else 0
        )
        em = Emission.objects.filter(pk=ligne["emission_id"]).first()
        duree_emission = (em.heure_fin - em.heure_debut).total_seconds() if em else 0

        resultat.append(
            {
                "emission_id": ligne["emission_id"],
                "titre": ligne["emission__titre"],
                "genre": ligne["emission__genre"],
                "spectateurs_moyens": round(ligne["spectateurs_moyens"] or 0),
                "pic": ligne["pic"] or 0,
                "duree_moyenne_vue_s": round(duree_moyenne),
                "taux_completion": (
                    round(duree_moyenne / duree_emission * 100, 1) if duree_emission else 0.0
                ),
            }
        )
    return Response(resultat)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def courbe(request, emission_id: int):
    """Série temporelle d'une émission — alimente le graphique Recharts."""
    try:
        heures = max(1, min(720, int(request.query_params.get("heures", 24))))
    except (TypeError, ValueError):
        heures = 24

    points = (
        ReleveAudience.objects.filter(
            emission_id=emission_id,
            instant__gte=timezone.now() - timedelta(hours=heures),
        )
        .order_by("instant")
        .values("instant", "spectateurs")
    )
    return Response(
        [{"instant": p["instant"].isoformat(), "spectateurs": p["spectateurs"]} for p in points]
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def resume(request):
    """Bandeau de tête du tableau de bord Direction."""
    em = emission_en_cours()
    return Response(
        {
            "ecrans_connectes": SessionAudience.actives().count(),
            "emission_en_cours": em.titre if em else None,
            "spectateurs_en_cours": SessionAudience.actives(em.id).count() if em else 0,
            "fenetre_s": int(FENETRE_ACTIVE.total_seconds()),
            "horodatage": timezone.now().isoformat(),
        }
    )
