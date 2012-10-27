def debug_variable(request):
    from django.conf import settings
    return {'debug': settings.DEBUG}
