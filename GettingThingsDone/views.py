from django.shortcuts import render_to_response
from django.template import RequestContext
from django.contrib.auth.decorators import login_required
from django.http import Http404
from django.db.models import Q
import re

from GettingThingsDone.models import TodoState, Node, Context

def get_todo_states():
    """Return a list of the "in-play" Todo states."""
    # TODO: be more selective about returning todo_states
    todo_states = TodoState.objects.all()
    return todo_states

def get_todo_abbrevs(todo_state_list=None):
    """Return a list of the TODO State abbreviations corresponding to TodoState models. If a list of TodoState objects is passed, it will use that instead of retrieving a new list. This is recommended to avoid hitting the database unnecessarily."""
    if not todo_state_list:
        todo_state_list = get_todo_states()
    abbreviation_list = []
    for todo_state in todo_state_list:
        abbreviation_list.append(todo_state.abbreviation)
    return abbreviation_list

def home(request):
    pass # Todo GTD/home view

def list_selection(request):
    pass # Todo list_selection view

def list_display(request, url_string):
    """Determines which list the user has requested and fetches it."""
    # todo_states = get_todo_states()
    todo_states_query = TodoState.objects.none()
    todo_abbrevs = get_todo_abbrevs(get_todo_states())
    todo_abbrevs_lc = []
    for todo_abbrev in todo_abbrevs:
        todo_abbrevs_lc.append(todo_abbrev.lower())
    nodes = Node.objects.none()
    context = None
    # Build regular expression to decide what's a valid URL string
    seperator = ""
    regex_string = "("
    for abbrev in todo_abbrevs:
        regex_string += seperator + abbrev
        seperator = "|"
    # (Add more URL regex pieces here)
    regex_string += seperator + "context)(\d*)"
    regex = re.compile(regex_string, re.IGNORECASE)
    regex_results = regex.findall(url_string)
    for result in regex_results:
        if result[0].lower() == "context": # URL asked for a context
            try:
                context = Context.objects.get(id=result[1])
            except Context.DoesNotExist:
                pass
        elif result[0].lower() in todo_abbrevs_lc: # It's a TodoState
            todo_states_query = todo_states_query | TodoState.objects.filter(abbreviation__iexact=result[0])
        # (Add more URL handling here)
    # Filter by todo state (use of Q() objects means we only hit database once
    final_Q = Q()
    for todo_state in todo_states_query:
        final_Q = final_Q | Q(todo_state=todo_state)
    nodes = Node.objects.filter(final_Q)
    # Now apply the context
    try:
        nodes = context.apply(nodes)
    except AttributeError:
        pass
    if nodes:
        return render_to_response('gtd_list.html',
                                  locals(),
                                  RequestContext(request))        
    else:
        # The request didn't match anything so we 404
        raise Http404("This URL did not match any conditions in GettingThingsDone.views.list_display()")

def agenda_selection(request):
    pass # Todo agenda_selection view

def agenda_display(request, which_agenda):
    pass # Todo agenda_display view
