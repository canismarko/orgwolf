def debug_variables(request):
    from django.conf import settings
    return {'debug': settings.DEBUG, 'enable_css': settings.ENABLE_CSS, 'enable_js': settings.ENABLE_JS}
