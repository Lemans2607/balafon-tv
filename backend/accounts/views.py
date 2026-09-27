from django.contrib.auth import authenticate
from rest_framework import generics, serializers, status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DemandeAcces, Utilisateur


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = Utilisateur
        fields = ["id", "nom", "email", "role"]


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(trim_whitespace=False)


class LoginView(APIView):
    """POST /api/auth/login/ → { token, user: { id, nom, role } }"""

    permission_classes = [AllowAny]

    def post(self, request):
        ser = LoginSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = authenticate(
            request,
            username=ser.validated_data["email"],
            password=ser.validated_data["password"],
        )
        if user is None:
            return Response(
                {"detail": "Email ou mot de passe incorrect."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": UserSerializer(user).data})


class MeView(generics.RetrieveAPIView):
    """GET /api/auth/me/"""

    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class DemandeAccesSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemandeAcces
        fields = ["id", "nom", "email", "password", "statut", "created_at"]
        extra_kwargs = {"password": {"write_only": True, "required": True}}

    def validate_email(self, value):
        if Utilisateur.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Un compte existe déjà avec cet email.")
        return value.lower()


class DemandeAccesView(generics.CreateAPIView):
    """POST /api/auth/demande-acces/ { nom, email, password } — panneau Inscription."""

    queryset = DemandeAcces.objects.all()
    serializer_class = DemandeAccesSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        return Response(
            {"message": "Demande transmise. Un administrateur vous recontactera par email."},
            status=response.status_code,
        )


class ListeDemandesView(generics.ListAPIView):
    """GET /api/auth/demandes/ — réservé aux administrateurs."""

    serializer_class = DemandeAccesSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return DemandeAcces.objects.filter(statut=DemandeAcces.Statut.EN_ATTENTE)
