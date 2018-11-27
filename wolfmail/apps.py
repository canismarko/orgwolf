from django.apps import AppConfig


class WolfmailConfig(AppConfig):
    name = "wolfmail"
    verbose_name = "Wolfmail"
    
    def ready(self):
        # Connect signals
        from . import signals
