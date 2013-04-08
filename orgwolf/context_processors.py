from gtd.models import Scope, Context

def debug_variables(request):
    from django.conf import settings
    return {
        'debug': settings.DEBUG, 
        'enable_css': settings.ENABLE_CSS, 
        'enable_js': settings.ENABLE_JS,
        'local_net': getattr(settings, 'LOCAL_NET', False)
        }

def scope_context(request):
    """Retrieve avaialable scope and context information"""
    scopes = Scope.objects.all() # Todo: collect for current user only
    contexts = Context.get_visible(request.user)
    return {
        'scopes': scopes,
        'contexts': contexts
        }
