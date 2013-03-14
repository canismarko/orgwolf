from gtd.models import Scope

def debug_variables(request):
    from django.conf import settings
    return {
        'debug': settings.DEBUG, 
        'enable_css': settings.ENABLE_CSS, 
        'enable_js': settings.ENABLE_JS,
        'local_net': settings.LOCAL_NET
        }

def scope_context(request):
    """Retrieve avaialable scope and context information"""
    scope_list = Scope.objects.all() # Todo: collect for current user only
    return {
        'scopes': scope_list
        }
