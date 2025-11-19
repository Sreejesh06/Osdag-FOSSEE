from django.apps import AppConfig


class DesignConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'design'

    def ready(self):  # pragma: no cover - signal wiring
        from django.db.models.signals import post_delete, post_save

        from design.models import LocationRecord
        from design.services import data_loader

        def _clear_cache(**kwargs):
            data_loader.clear_cached_payload()

        post_save.connect(_clear_cache, sender=LocationRecord)
        post_delete.connect(_clear_cache, sender=LocationRecord)
