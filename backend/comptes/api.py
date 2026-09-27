"""
API d'authentification (JWT SimpleJWT) et de gestion des comptes.

Endpoints (préfixés /api/auth/ dans urls.py) :
    POST /auth/connexion/     { email, mot_de_passe } → { access, refresh }
    POST /auth/rafraichir/    { refresh }             → { access }
    POST /auth/deconnexion/   { refresh }             → blacklist du token
    GET  /auth/profil/        utilisateur courant
    CRUD /auth/comptes/       (admin uniquement)
"""
from django.contrib.auth import authenticate
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Utilisateur


# ---------------------------------------------------------------- Permissions
class EstAdmin:
    """Mixin de permission : administrateur de la plateforme."""


def est_admin(user) -> bool:
    return bool(user and user.is_authenticated and user.est_admin)


def est_admin_ou_directeur(user) -> bool:
    return bool(user and user.is_authenticated and user.peut_gerer_grille)


# --------------------------------------------------------------- Serializers
class UtilisateurSerializer(serializers.ModelSerializer):
    """Représentation publique d'un compte (jamais le mot de passe)."""

    role = serializers.CharField(read_only=True)

    class Meta:
        model = Utilisateur
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "est_admin",
            "est_directeur_antenne",
            "role",
            "date_joined",
        ]
        read_only_fields = ["date_joined", "role"]


class ConnexionSerializer(serializers.Serializer):
    """Validation du formulaire de connexion."""

    email = serializers.EmailField()
    mot_de_passe = serializers.CharField(write_only=True, trim_whitespace=False)


def _jetons_pour(utilisateur: Utilisateur) -> dict:
    """Paire JWT avec le rôle embarqué (décodage rapide côté frontend)."""
    refresh = RefreshToken.for_user(utilisateur)
    refresh["role"] = utilisateur.role
    access = refresh.access_token
    access["role"] = utilisateur.role
    return {"access": str(access), "refresh": str(refresh)}


# ------------------------------------------------------------------- Actions
@api_view(["POST"])
@permission_classes([AllowAny])
def connexion(request) -> Response:
    """Authentifie par email + mot de passe et retourne une paire JWT."""
    ser = ConnexionSerializer(data=request.data)
    ser.is_valid(raise_exception=True)

    utilisateur = authenticate(
        request,
        username=ser.validated_data["email"],
        password=ser.validated_data["mot_de_passe"],
    )
    if utilisateur is None or not utilisateur.is_active:
        return Response(
            {"detail": "Identifiants invalides."},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    return Response(
        {**_jetons_pour(utilisateur), "utilisateur": UtilisateurSerializer(utilisateur).data},
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def deconnexion(request) -> Response:
    """Met le refresh token en liste noire (déconnexion effective)."""
    token = request.data.get("refresh")
    if not token:
        return Response(
            {"detail": "Token 'refresh' requis."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        RefreshToken(token).blacklist()
    except Exception:  # noqa: BLE001
        return Response(
            {"detail": "Token invalide ou déjà révoqué."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return Response(status=status.HTTP_205_RESET_CONTENT)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def profil(request) -> Response:
    """Retourne le profil de l'utilisateur courant."""
    return Response(UtilisateurSerializer(request.user).data)


# -------------------------------------------------------------------- CRUD
class CompteViewSet(viewsets.ModelViewSet):
    """CRUD des comptes — réservé à l'administrateur de la plateforme."""

    queryset = Utilisateur.objects.all().order_by("id")
    serializer_class = UtilisateurSerializer

    def get_permissions(self):
        return [IsAuthenticated()]

    def check_admin(self):
        if not est_admin(self.request.user):
            self.permission_denied(self.request, message="Réservé aux administrateurs.")

    def create(self, request, *args, **kwargs):
        self.check_admin()
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        self.check_admin()
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        self.check_admin()
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self.check_admin()
        return super().destroy(request, *args, **kwargs)
