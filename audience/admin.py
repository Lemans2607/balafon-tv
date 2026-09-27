from django.contrib import admin

from .models import ReleveAudience, SessionAudience


@admin.register(SessionAudience)
class SessionAudienceAdmin(admin.ModelAdmin):
    list_display = ("cle_session", "emission", "battements", "dernier_battement", "duree_vue_s")
    list_filter = ("emission__genre", "dernier_battement")
    search_fields = ("cle_session",)
    readonly_fields = ("empreinte", "premier_battement", "dernier_battement", "battements")


@admin.register(ReleveAudience)
class ReleveAudienceAdmin(admin.ModelAdmin):
    list_display = ("emission", "spectateurs", "instant")
    list_filter = ("emission__genre", "instant")
    date_hierarchy = "instant"
