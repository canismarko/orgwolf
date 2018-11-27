from django.apps import AppConfig


class GTDConfig(AppConfig):
    name = "gtd"
    verbose_name = "Getting Things Done"
    def ready(self):
        from . import signals
