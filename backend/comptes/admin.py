"""Administration Django des comptes."""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Utilisateur


@admin.register(Utilisateur)
class UtilisateurAdmin(UserAdmin):
    ordering = ["email"]
    list_display = ["email", "first_name", "last_name", "est_admin", "est_directeur_antenne", "is_active"]
    list_filter = ["est_admin", "est_directeur_antenne", "is_active"]
    search_fields = ["email", "first_name", "last_name"]
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Identité", {"fields": ("first_name", "last_name")}),
        ("Rôles", {"fields": ("est_admin", "est_directeur_antenne")}),
        (
            "Statut",
            {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")},
        ),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "first_name", "last_name", "password1", "password2", "est_admin", "est_directeur_antenne"),
            },
        ),
    )
