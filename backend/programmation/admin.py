"""Administration Django des grilles et émissions."""
from django.contrib import admin

from .models import Chaine, Emission, Grille


class EmissionInline(admin.TabularInline):
    model = Emission
    extra = 0
    fields = ["titre", "genre", "heure_debut", "heure_fin", "image_affiche", "fiabilite"]


@admin.register(Chaine)
class ChaineAdmin(admin.ModelAdmin):
    list_display = ["nom", "slug", "type", "actif"]
    prepopulated_fields = {"slug": ("nom",)}


@admin.register(Grille)
class GrilleAdmin(admin.ModelAdmin):
    list_display = ["chaine", "date_debut", "date_fin", "statut", "cree_par", "valide_par"]
    list_filter = ["statut", "chaine"]
    inlines = [EmissionInline]


@admin.register(Emission)
class EmissionAdmin(admin.ModelAdmin):
    list_display = ["titre", "grille", "genre", "heure_debut", "heure_fin", "fiabilite"]
    list_filter = ["genre", "fiabilite"]
    search_fields = ["titre"]
